"""Fail-closed, minimal Artportalen snapshot contract. Never reads personal files.

Provider and field contracts: biodiversitydata-se/SOS Docs/SearchFilter.md,
Docs/Observation.md, Docs/FieldSets.md. No live integration is claimed by tests.
"""
from __future__ import annotations
import hashlib
import json
import os
import tempfile
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

PROVIDER_ID = 1
MUNICIPALITY = '1277'
AVES_ID = 4000104
STOCKHOLM = ZoneInfo('Europe/Stockholm')
FIELDS = ['dataProviderId', 'occurrence.occurrenceId', 'occurrence.isPositiveObservation', 'taxon.id',
          'taxon.vernacularName', 'taxon.scientificName', 'taxon.taxonRank',
          'event.startDate', 'event.plainStartDate', 'location.municipality.featureId']
TAXONOMY_POLICY = 'species-rank-only-v1'

class DataError(ValueError):
    pass

def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)

def day(value):
    if not isinstance(value, str) or len(value) != 10:
        raise DataError('Invalid calendar date')
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise DataError('Invalid calendar date') from exc

def observation_day(event):
    if event.get('plainStartDate'):
        return day(event['plainStartDate'])
    value = event.get('startDate')
    if not isinstance(value, str):
        raise DataError('Missing source date')
    try:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return stamp.astimezone(STOCKHOLM).date() if stamp.tzinfo else day(value[:10])
    except ValueError as exc:
        raise DataError('Invalid source date') from exc

def normalize(record):
    """Allowlist only. No names of people, comments, locations or coordinates."""
    if not isinstance(record, dict) or type(record.get('dataProviderId')) is not int or record.get('dataProviderId') != PROVIDER_ID:
        raise DataError('Missing or non-Artportalen provider')
    location = record.get('location', {})
    if not isinstance(location, dict) or not isinstance(location.get('municipality', {}), dict):
        raise DataError('Invalid municipality structure')
    scopes = [value for value in (record.get('municipalityId'), location.get('municipality', {}).get('featureId')) if value is not None]
    if not scopes or any(value != MUNICIPALITY for value in scopes):
        raise DataError('Record municipality missing, conflicting or out of scope')
    occurrence = record.get('occurrence', {})
    if not isinstance(occurrence, dict):
        raise DataError('Invalid occurrence structure')
    if not isinstance(occurrence.get('isPositiveObservation'), bool):
        raise DataError('Missing occurrence presence status')
    identifier = occurrence.get('occurrenceId')
    if not isinstance(identifier, str) or not identifier.strip():
        raise DataError('Missing stable occurrence ID')
    taxon = record.get('taxon', {})
    if not isinstance(taxon, dict):
        raise DataError('Invalid taxon structure')
    taxon_id = taxon.get('id')
    if not integer(taxon_id) or taxon_id <= 0:
        raise DataError('Missing stable Dyntaxa ID')
    rank = taxon.get('taxonRank')
    scientific = taxon.get('scientificName')
    if not isinstance(rank, str) or not rank or not isinstance(scientific, str) or not scientific:
        raise DataError('Missing taxon rank/name')
    vernacular = taxon.get('vernacularName') or scientific
    if not isinstance(vernacular, str):
        raise DataError('Invalid display name')
    event = record.get('event', {})
    if not isinstance(event, dict):
        raise DataError('Invalid date structure')
    if event.get('startDate') is not None and not isinstance(event['startDate'], str):
        raise DataError('Source timestamp must be a string')
    source_day = observation_day(event)
    return {'dataProviderId': PROVIDER_ID, 'municipalityId': MUNICIPALITY, 'occurrence': {'occurrenceId': identifier, 'isPositiveObservation': occurrence['isPositiveObservation']},
            'taxon': {'id': taxon_id, 'taxonRank': rank, 'scientificName': scientific,
                      'vernacularName': vernacular},
            'event': {'plainStartDate': source_day.isoformat(), 'startDate': source_day.isoformat()}}

def digest(records):
    canonical = json.dumps(sorted(records, key=lambda r: r['occurrence']['occurrenceId']),
                           ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()

def search_filter(first, last):
    first, last = day(first), day(last)
    if first > last:
        raise DataError('Reversed coverage')
    start = datetime.combine(first, time.min, STOCKHOLM).astimezone(timezone.utc)
    end = datetime.combine(last + timedelta(days=1), time.min, STOCKHOLM).astimezone(timezone.utc) - timedelta(milliseconds=1)
    return {'dataProvider': {'ids': [PROVIDER_ID]},
            'taxon': {'ids': [AVES_ID], 'includeUnderlyingTaxa': True},
            'geographics': {'areas': [{'areaType': 'Municipality', 'featureId': MUNICIPALITY}]},
            'date': {'startDate': start.isoformat(timespec='milliseconds'),
                     'endDate': end.isoformat(timespec='milliseconds'), 'dateFilterType': 'OnlyStartDate'},
            'output': {'fields': FIELDS[:]}}

def checked_records(records, first, last):
    if not isinstance(records, list):
        raise DataError('Records must be an array')
    normalized, seen = [], set()
    for record in records:
        item = normalize(record)
        identifier = item['occurrence']['occurrenceId']
        if identifier in seen:
            raise DataError('Duplicate occurrence ID: incomplete or overlapping source')
        seen.add(identifier)
        if not day(first) <= observation_day(item['event']) <= day(last):
            raise DataError('Record outside requested coverage')
        normalized.append(item)
    return normalized

def snapshot(records, first, last, retrieved_at, partitions):
    records = checked_records(records, first, last)
    query = search_filter(first, last)
    return {'schemaVersion': 1, 'source': {
        'name': 'Artportalen via SLU SOS', 'dataProviderId': PROVIDER_ID,
        'municipalityId': MUNICIPALITY, 'retrievedAt': retrieved_at,
        'fromDay': first, 'toDay': last, 'complete': True,
        'sensitiveObservations': False, 'query': query,
        'recordCount': len(records), 'recordsSha256': digest(records), 'partitions': partitions,
        'consistency': 'count-checked-not-transactional',
        'limitations': ['Public reports only; not expert validation.',
                       'Count checks cannot prove an atomic source snapshot.',
                       'Coverage is bounded; not automatically all historical reports.']},
        'records': records}

def validate_snapshot(data, now=None):
    if not isinstance(data, dict) or type(data.get('schemaVersion')) is not int or data.get('schemaVersion') != 1:
        raise DataError('Unsupported snapshot')
    source = data.get('source', {})
    if not isinstance(source, dict):
        raise DataError('Invalid source metadata')
    if (type(source.get('dataProviderId')) is not int or source.get('dataProviderId') != PROVIDER_ID or source.get('municipalityId') != MUNICIPALITY
            or source.get('complete') is not True or source.get('sensitiveObservations') is not False):
        raise DataError('Snapshot scope/completeness not established')
    first, last = source.get('fromDay'), source.get('toDay')
    if source.get('query') != search_filter(first, last):
        raise DataError('Unexpected source query')
    try:
        retrieved = datetime.fromisoformat(source['retrievedAt'].replace('Z', '+00:00'))
        if retrieved.tzinfo is None:
            raise ValueError()
    except (KeyError, ValueError, AttributeError) as exc:
        raise DataError('Missing timezone-aware retrieval time') from exc
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None or retrieved > current:
        raise DataError('Retrieval time cannot be in the future or timezone-less')
    if day(last) > retrieved.astimezone(STOCKHOLM).date():
        raise DataError('Coverage cannot extend beyond retrieval day')
    partitions = source.get('partitions')
    if not isinstance(partitions, list) or not partitions:
        raise DataError('Missing pagination evidence')
    next_day, counted = day(first), 0
    for partition in partitions:
        if day(partition.get('fromDay')) != next_day or day(partition.get('toDay')) < next_day:
            raise DataError('Missing or overlapping source partition')
        amount = partition.get('countBefore')
        if not integer(amount) or amount < 0 or partition.get('countAfter') != amount or partition.get('fetchedCount') != amount:
            raise DataError('Incomplete partition counts')
        counted += amount
        next_day = day(partition['toDay']) + timedelta(days=1)
    if next_day != day(last) + timedelta(days=1) or counted != source.get('recordCount'):
        raise DataError('Partition coverage/count mismatch')
    records = checked_records(data.get('records'), first, last)
    if source.get('recordCount') != len(records) or source.get('recordsSha256') != digest(records):
        raise DataError('Source count/hash mismatch')
    # Reconstruct provenance, never spread untrusted metadata into public exports.
    clean_partitions = [{key: part[key] for key in ('fromDay', 'toDay', 'countBefore', 'countAfter', 'fetchedCount')} for part in partitions]
    clean_source = snapshot(records, first, last, retrieved.isoformat(), clean_partitions)['source']
    return records, clean_source

def atomic_json(path, data):
    """Replace only after serialization, disk write and fsync all succeed."""
    encoded = json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=target.parent, prefix='.' + target.name, delete=False) as f:
            name = f.name
            f.write(encoded)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, target)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)

def aggregates(data):
    records, source = validate_snapshot(data)
    grouped, excluded = {}, defaultdict(int)
    for record in records:
        if not record['occurrence']['isPositiveObservation']:
            excluded['not-positive'] += 1
            continue
        taxon = record['taxon']
        if taxon['taxonRank'].lower() != 'species':
            excluded[taxon['taxonRank']] += 1
            continue
        identifier = taxon['id']
        name = taxon['vernacularName']
        name = name[:1].upper() + name[1:]
        stat = grouped.setdefault(identifier, {'taxonId': identifier, 'name': name,
            'latin': taxon['scientificName'], 'total': 0, 'months': [0] * 12, 'days': defaultdict(set)})
        if (stat['name'], stat['latin']) != (name, taxon['scientificName']):
            raise DataError('Conflicting names for one stable taxon: reconcile taxonomy')
        observed = observation_day(record['event'])
        stat['total'] += 1
        stat['months'][observed.month - 1] += 1
        stat['days'][observed.strftime('%m-%d')].add(observed.year)
    names = [stat['name'] for stat in grouped.values()]
    if len(names) != len(set(names)):
        raise DataError('Distinct Dyntaxa IDs share a display name: reconcile before name-keyed legacy UI')
    provenance = {**source, 'taxonomyPolicy': TAXONOMY_POLICY,
                  'excludedByTaxonRank': dict(excluded), 'includedObservations': sum(s['total'] for s in grouped.values())}
    return grouped, provenance

def category(total):
    return 'abundant' if total >= 50 else 'regular' if total >= 10 else 'uncommon' if total >= 5 else 'rare'

def species_guide(data):
    grouped, source = aggregates(data)
    species = []
    for item in sorted(grouped.values(), key=lambda item: item['taxonId']):
        species.append({k: v for k, v in item.items() if k != 'days'} | {'category': category(item['total'])})
    return {'generated': source['retrievedAt'][:10], 'exportDate': source['retrievedAt'][:10],
            'source': 'Artportalen via SLU SOS, Åstorps kommun', 'provenance': source,
            'totalObservations': source['recordCount'], 'species': species}

def radial_data(data):
    grouped, source = aggregates(data)
    result = {'_meta': source | {'generated': source['retrievedAt'][:10], 'systemc_sources': [],
                                 'taxonIdsByName': {s['name']: s['taxonId'] for s in grouped.values()}}}
    for item in grouped.values():
        result[item['name']] = {key: len(years) for key, years in sorted(item['days'].items())}
    return result
