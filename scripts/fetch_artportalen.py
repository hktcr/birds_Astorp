"""Transport-injected SOS downloader; no credentials or live CLI entry point.

An approved server-side transport must supply request(endpoint, params, body)
returning decoded successful JSON. Tests use fixtures, never SLU calls.
Count/Search are mutable, not transactional; equal counts are not a snapshot proof.
"""
from datetime import datetime, timedelta, timezone
from artportalen_data import DataError, checked_records, day, integer, search_filter, snapshot, validate_snapshot

PAGE_SIZE = 1000
# Public docs conflict with newer server configuration. Stay below the lower
# documented 10,000 result window; live contract must still be integration-tested.
PARTITION_LIMIT = 9000

def download_snapshot(request, first, last, page_size=PAGE_SIZE, partition_limit=PARTITION_LIMIT):
    if not 1 <= page_size <= PAGE_SIZE or not 1 <= partition_limit <= PARTITION_LIMIT:
        raise DataError('Unsafe paging limits')
    common = {'sensitiveObservations': 'false'}
    all_records, partitions = [], []

    def count(body):
        value = request('Count', common.copy(), body)
        if not integer(value) or value < 0:
            raise DataError('Invalid count response')
        return value

    def partition(start, end):
        body = search_filter(start.isoformat(), end.isoformat())
        expected = count(body)
        if expected > partition_limit:
            if start == end:
                raise DataError('One day exceeds safe paging window; approved finer partition required')
            middle = start + (end - start) // 2
            left = partition(start, middle)
            right = partition(middle + timedelta(days=1), end)
            if left + right != expected or count(body) != expected:
                raise DataError('Source changed while partitioning')
            return expected
        records, seen = [], set()
        while len(records) < expected:
            skip = len(records)
            take = min(page_size, expected - skip)
            params = common | {'skip': skip, 'take': take, 'translationCultureCode': 'sv-SE',
                               'sortBy': 'occurrence.occurrenceId', 'sortOrder': 'Asc'}
            response = request('Search', params, body)
            if not isinstance(response, dict) or response.get('totalCount') != expected:
                raise DataError('Search total differs from Count')
            if response.get('skip') != skip or response.get('take') != take:
                raise DataError('Unexpected page offset/size')
            page = response.get('records')
            if not isinstance(page, list) or len(page) != take:
                raise DataError('Incomplete page; previous data must be retained')
            normalized = checked_records(page, start.isoformat(), end.isoformat())
            for record in normalized:
                identifier = record['occurrence']['occurrenceId']
                if identifier in seen:
                    raise DataError('Overlapping pages; source may have changed')
                seen.add(identifier)
                records.append(record)
        if count(body) != expected:
            raise DataError('Source count changed during retrieval')
        partitions.append({'fromDay': start.isoformat(), 'toDay': end.isoformat(),
                           'countBefore': expected, 'countAfter': expected, 'fetchedCount': len(records)})
        all_records.extend(records)
        return expected

    partition(day(first), day(last))
    # Duplicate IDs crossing partitions also fail, never silently discard them.
    result = snapshot(all_records, first, last, datetime.now(timezone.utc).isoformat(), partitions)
    validate_snapshot(result)
    return result
