#!/usr/bin/env python3
"""Offline fixtures only. No real observation, identity, coordinate or API key."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from artportalen_data import *
from fetch_artportalen import download_snapshot


def record(identifier='synthetic:1', taxon_id=100, name='Testfågel', observed='2026-01-01', rank='species'):
    return {'dataProviderId': 1, 'location': {'municipality': {'featureId': '1277'}}, 'occurrence': {'occurrenceId': identifier, 'isPositiveObservation': True},
            'taxon': {'id': taxon_id, 'taxonRank': rank, 'vernacularName': name, 'scientificName': 'Testus exemplus'},
            'event': {'plainStartDate': observed, 'startDate': observed}}


def source(records):
    return snapshot(records, '2024-01-01', '2026-10-25', '2026-10-25T12:00:00+00:00', [{'fromDay':'2024-01-01','toDay':'2026-10-25','countBefore':len(records),'countAfter':len(records),'fetchedCount':len(records)}])


class FakeTransport:
    def __init__(self, records, fault=None):
        self.records, self.calls, self.fault = records, [], fault
    def __call__(self, endpoint, params, body):
        self.calls.append((endpoint, copy.deepcopy(params), copy.deepcopy(body)))
        start = datetime.fromisoformat(body['date']['startDate']).astimezone(STOCKHOLM).date()
        end = datetime.fromisoformat(body['date']['endDate']).astimezone(STOCKHOLM).date()
        rows = sorted([r for r in self.records if start <= observation_day(r['event']) <= end], key=lambda r: r['occurrence']['occurrenceId'])
        if endpoint == 'Count':
            if self.fault == 'changed-count' and sum(c[0] == 'Count' for c in self.calls) > 1:
                return len(rows) + 1
            return len(rows)
        skip, take = params['skip'], params['take']
        batch = copy.deepcopy(rows[skip:skip + take])
        if self.fault == 'http' and skip:
            raise OSError('Synthetic HTTP failure')
        if self.fault == 'short' and skip:
            batch = []
        if self.fault == 'overlap' and skip:
            batch[0] = rows[0]
        return {'skip': skip, 'take': take, 'totalCount': len(rows), 'records': batch}


class Tests(unittest.TestCase):
    def test_complete_pagination_and_request_constraints(self):
        records = [record(f'synthetic:{i}') for i in range(5)]
        transport = FakeTransport(records)
        result = download_snapshot(transport, '2026-01-01', '2026-01-02', page_size=2)
        self.assertEqual(len(validate_snapshot(result)[0]), 5)
        pages = [p for e,p,b in transport.calls if e == 'Search']
        self.assertEqual([p['skip'] for p in pages], [0,2,4])
        for endpoint, params, body in transport.calls:
            self.assertEqual(params['sensitiveObservations'], 'false')
            self.assertEqual(body['dataProvider'], {'ids':[1]})
            self.assertEqual(body['geographics']['areas'][0]['featureId'], '1277')
            self.assertIn('taxon.id', body['output']['fields'])
            self.assertIn('occurrence.occurrenceId', body['output']['fields'])
    def test_disjoint_partitions_and_combined_count(self):
        records = [record(f'synthetic:{i}', observed=f'2026-01-{i//2+1:02}') for i in range(6)]
        result = download_snapshot(FakeTransport(records), '2026-01-01', '2026-01-03', page_size=2, partition_limit=2)
        self.assertEqual(len(result['records']), 6)
        self.assertEqual(len(result['source']['partitions']), 3)
    def test_dense_single_day_fails_not_truncates(self):
        with self.assertRaises(DataError):
            download_snapshot(FakeTransport([record(str(i)) for i in range(3)]), '2026-01-01', '2026-01-01', partition_limit=2)
    def test_failures_preserve_previous_output(self):
        for failure in ['http', 'short', 'overlap', 'changed-count']:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                target = Path(directory)/'previous.json'; target.write_text('previous complete data')
                with self.assertRaises((OSError, DataError)):
                    result = download_snapshot(FakeTransport([record(str(i)) for i in range(3)], failure), '2026-01-01', '2026-01-01', page_size=2)
                    atomic_json(target, result)
                self.assertEqual(target.read_text(), 'previous complete data')
    def test_bad_schema_and_total(self):
        for response in [{'records':[]}, {'skip':0, 'take':1, 'totalCount':2, 'records':[record()]}]:
            with self.assertRaises(DataError):
                download_snapshot(lambda e,p,b: 1 if e=='Count' else response, '2026-01-01','2026-01-01')
    def test_zero_count_is_complete_not_error(self):
        self.assertEqual(download_snapshot(FakeTransport([]), '2026-01-01', '2026-01-01')['records'], [])
    def test_wrong_provider_missing_id_missing_date_rejected(self):
        for mutate in [lambda r:r.update(dataProviderId=2), lambda r:r['location']['municipality'].update(featureId='other'), lambda r:r['occurrence'].pop('occurrenceId'),
                       lambda r:r['taxon'].pop('id'), lambda r:r.update(event={}),
                       lambda r:r['occurrence'].pop('isPositiveObservation')]:
            item = record(); mutate(item)
            with self.assertRaises(DataError): source([item])
    def test_duplicate_ids_rejected_case_preserved(self):
        with self.assertRaises(DataError): source([record(), record()])
        self.assertEqual(len(source([record('ABC'),record('abc')])['records']),2)
    def test_no_private_fields_survive(self):
        item=record(); item['location'].update(decimalLatitude=99, locality='PRIVATE_SENTINEL')
        item['occurrence'].update(reportedBy='PRIVATE_SENTINEL', occurrenceRemarks='PRIVATE_SENTINEL')
        self.assertNotIn('PRIVATE_SENTINEL',json.dumps(source([item])))
    def test_provenance_allowlist_drops_private_metadata(self):
        data=source([record()])
        data['source']['reportedBy']='PRIVATE_SENTINEL'
        data['source']['partitions'][0]['locality']='PRIVATE_SENTINEL'
        self.assertNotIn('PRIVATE_SENTINEL',json.dumps(species_guide(data)))
        self.assertNotIn('PRIVATE_SENTINEL',json.dumps(radial_data(data)))
    def test_nested_date_and_conflicting_scope_rejected(self):
        item=record();item['event']['startDate']={'locality':'PRIVATE_SENTINEL'}
        with self.assertRaises(DataError):source([item])
        item=record();item['municipalityId']='1277';item['location']['municipality']['featureId']='elsewhere'
        with self.assertRaises(DataError):source([item])
    def test_record_subobjects_must_be_objects(self):
        for field in ['occurrence','taxon','event','location']:
            item=record();item[field]=None
            with self.assertRaises(DataError):source([item])
    def test_species_aggregate_by_id_not_name(self):
        data=source([record('a'),record('b'),record('c',taxon_id=101,name='Annan fågel')])
        guide=species_guide(data)
        self.assertEqual([sp['total'] for sp in guide['species']],[2,1])
        self.assertTrue(all(sp['total']==sum(sp['months']) for sp in guide['species']))
        self.assertEqual([sp['taxonId'] for sp in guide['species']],[100,101])
    def test_same_name_different_id_never_silently_merged(self):
        with self.assertRaises(DataError): species_guide(source([record('a'),record('b',taxon_id=101)]))
    def test_conflicting_taxonomy_stops(self):
        with self.assertRaises(DataError): species_guide(source([record('a'),record('b',name='Ändrat namn')]))
    def test_non_species_and_absence_explicitly_excluded(self):
        absent=record('c');absent['occurrence']['isPositiveObservation']=False
        guide=species_guide(source([record('a'),record('b',taxon_id=101,rank='subspecies'),absent]))
        self.assertEqual(guide['species'][0]['total'],1)
        self.assertEqual(guide['provenance']['excludedByTaxonRank'],{'subspecies':1,'not-positive':1})
    def test_yearwheel_unique_year_day_from_same_source(self):
        data=source([record('a',observed='2024-02-29'),record('b',observed='2024-02-29'),record('c',observed='2025-01-01')])
        result=radial_data(data)
        self.assertEqual(result['Testfågel'],{'02-29':1,'01-01':1})
        self.assertEqual(result['_meta']['recordsSha256'],species_guide(data)['provenance']['recordsSha256'])
        self.assertEqual(result['_meta']['systemc_sources'],[])
    def test_legacy_and_tampered_snapshots_rejected(self):
        for data in [{'_meta': {'systemc_sources':['private.json']}}, source([record()])]:
            if 'source' in data: data['source']['recordCount']=999
            with self.assertRaises(DataError): validate_snapshot(data)
    def test_invalid_source_date_and_timezone(self):
        with self.assertRaises(DataError): source([record(observed='2026-02-30')])
        self.assertEqual(observation_day({'startDate':'2026-10-24T22:30:00Z'}).isoformat(),'2026-10-25')
        body=search_filter('2026-10-25','2026-10-25')
        self.assertEqual(body['date']['startDate'],'2026-10-24T22:00:00.000+00:00')
        self.assertEqual(body['date']['endDate'],'2026-10-25T22:59:59.999+00:00')
    def test_atomic_replace_failure_preserves_old_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'out.json';target.write_text('previous')
            with patch('artportalen_data.os.replace',side_effect=OSError('fixture failure')):
                with self.assertRaises(OSError):atomic_json(target,{'new':True})
            self.assertEqual(target.read_text(),'previous')
            self.assertEqual([p.name for p in Path(directory).iterdir()],['out.json'])
    def test_offline_generators_fail_without_touching_existing(self):
        for filename in ['update-species-guide.py','generate_radial_data.py']:
            spec=importlib.util.spec_from_file_location('generator',Path(__file__).parent/filename)
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            with tempfile.TemporaryDirectory() as directory:
                old=Path(directory)/'old.json';old.write_text('previous')
                invalid=Path(directory)/'invalid.json';invalid.write_text('{}')
                with self.assertRaises(DataError):module.generate(invalid,old)
                self.assertEqual(old.read_text(),'previous')
                valid=Path(directory)/'valid.json';valid.write_text(json.dumps(source([record()])))
                module.generate(valid,old)
                self.assertIsInstance(json.loads(old.read_text()),dict)

if __name__=='__main__': unittest.main(verbosity=2)
