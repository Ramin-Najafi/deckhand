
// Helper to get dates relative to today in local calendar
const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = new Date();
const tomorrowStr = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));

const createDate = (timeStr: string) => {
  const [h, m, s] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, s || 0, 0);
  return d.toISOString();
};

export const seedAssets = [
  { id: '11111111-1111-1111-1111-100000000001', name: 'Seaspan Raven', short_name: 'Raven', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000002', name: 'Seaspan Eagle', short_name: 'Eagle', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000003', name: 'Seaspan Osprey', short_name: 'Osprey', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000004', name: 'Seaspan Hawk', short_name: 'Hawk', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000005', name: 'Seaspan Kestrel', short_name: 'Kestrel', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000006', name: 'Seaspan Falcon', short_name: 'Falcon', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000007', name: 'Seaspan Condor', short_name: 'Condor', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000008', name: 'Seaspan Heron', short_name: 'Heron', asset_type: 'Tug', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000009', name: 'Barge Titan', short_name: 'B-Titan', asset_type: 'Barge', time_zone: 'UTC', version: 1 },
  { id: '11111111-1111-1111-1111-100000000010', name: 'Barge Goliath', short_name: 'B-Goliath', asset_type: 'Barge', time_zone: 'UTC', version: 1 },
];

export const seedLocations = [
  { id: '22222222-2222-2222-2222-200000000001', name: 'Vancouver Harbour', short_name: 'YVR', lat: 49.2827, lng: -123.1207, version: 1 },
  { id: '22222222-2222-2222-2222-200000000002', name: 'Victoria Port', short_name: 'YYJ', lat: 48.4284, lng: -123.3656, version: 1 },
];

export const seedPersons = [
  { id: '33333333-3333-3333-3333-300000000001', name: 'Captain Ahab', position: 'Captain', assigned_asset_id: '11111111-1111-1111-1111-100000000001', version: 1 },
  { id: '33333333-3333-3333-3333-300000000002', name: 'Starbuck', position: 'Mate', assigned_asset_id: '11111111-1111-1111-1111-100000000001', version: 1 },
  { id: '33333333-3333-3333-3333-300000000003', name: 'Jack Sparrow', position: 'Captain', version: 1 },
  { id: '33333333-3333-3333-3333-300000000004', name: 'Will Turner', position: 'Deckhand', version: 1 },
  { id: '33333333-3333-3333-3333-300000000005', name: 'Joshamee Gibbs', position: 'Mate', version: 1 },
  { id: '33333333-3333-3333-3333-300000000006', name: 'Captain Hook', position: 'Captain', version: 1 },
];

export const seedCertifications = [
  { id: '44444444-4444-4444-4444-400000000001', person_id: '33333333-3333-3333-3333-300000000001', cert_type: 'Master Mariner', obtained: '2020-01-01', expires: '2030-01-01', required_to_operate: true, version: 1 },
  { id: '44444444-4444-4444-4444-400000000002', person_id: '33333333-3333-3333-3333-300000000002', cert_type: 'Mate Certificate', obtained: '2022-01-01', expires: '2030-01-01', required_to_operate: true, version: 1 },
  { id: '44444444-4444-4444-4444-400000000003', person_id: '33333333-3333-3333-3333-300000000003', cert_type: 'Master Mariner', obtained: '2015-01-01', expires: '2027-01-01', required_to_operate: true, version: 1 },
  // Expiring tomorrow for Hook!
  { id: '44444444-4444-4444-4444-400000000004', person_id: '33333333-3333-3333-3333-300000000006', cert_type: 'Master Mariner', obtained: '2021-01-01', expires: tomorrowStr, required_to_operate: true, version: 1 },
];

export const seedJobs = [
  { id: '55555555-5555-5555-5555-500000000001', job_number: 'JOB-A001', assigned_asset_id: '11111111-1111-1111-1111-100000000001', planned_start: createDate('06:00:00'), planned_end: createDate('09:00:00'), status: 'Assigned', version: 1, customer_id: 'Acme Corp' },
  { id: '55555555-5555-5555-5555-500000000002', job_number: 'JOB-A002', assigned_asset_id: '11111111-1111-1111-1111-100000000001', planned_start: createDate('10:00:00'), planned_end: createDate('14:00:00'), status: 'Assigned', version: 1, customer_id: 'Pacific Logging' },
  { id: '55555555-5555-5555-5555-500000000003', job_number: 'JOB-A003', assigned_asset_id: '11111111-1111-1111-1111-100000000002', planned_start: createDate('08:00:00'), planned_end: createDate('12:00:00'), status: 'Assigned', version: 1, customer_id: 'Coastal Freight' },
  { id: '55555555-5555-5555-5555-500000000004', job_number: 'JOB-A004', assigned_asset_id: '11111111-1111-1111-1111-100000000003', planned_start: createDate('07:00:00'), planned_end: createDate('10:00:00'), status: 'Assigned', version: 1, customer_id: 'Helm Corp' },
  { id: '55555555-5555-5555-5555-500000000005', job_number: 'JOB-A005', assigned_asset_id: '11111111-1111-1111-1111-100000000004', planned_start: createDate('11:00:00'), planned_end: createDate('15:00:00'), status: 'Assigned', version: 1, customer_id: 'Acme Corp' },
  { id: '55555555-5555-5555-5555-500000000006', job_number: 'JOB-A006', assigned_asset_id: '11111111-1111-1111-1111-100000000005', planned_start: createDate('09:00:00'), planned_end: createDate('13:00:00'), status: 'Assigned', version: 1, customer_id: 'Northstar' },
  { id: '55555555-5555-5555-5555-500000000007', job_number: 'JOB-A007', assigned_asset_id: '11111111-1111-1111-1111-100000000006', planned_start: createDate('14:00:00'), planned_end: createDate('17:00:00'), status: 'Assigned', version: 1, customer_id: 'Northstar' },
  
  { id: '55555555-5555-5555-5555-500000000010', job_number: 'JOB-U010', planned_start: createDate('10:00:00'), planned_end: createDate('12:00:00'), status: 'Unassigned', version: 1, customer_id: 'Helm Corp' },
  { id: '55555555-5555-5555-5555-500000000011', job_number: 'JOB-U011', planned_start: createDate('13:00:00'), planned_end: createDate('16:00:00'), status: 'Unassigned', version: 1, customer_id: 'Acme Corp' },
  { id: '55555555-5555-5555-5555-500000000012', job_number: 'JOB-U012', planned_start: createDate('08:00:00'), planned_end: createDate('11:00:00'), status: 'Unassigned', version: 1, customer_id: 'Pacific Logging' },
  { id: '55555555-5555-5555-5555-500000000013', job_number: 'JOB-U013', planned_start: createDate('15:00:00'), planned_end: createDate('18:00:00'), status: 'Unassigned', version: 1, customer_id: 'Coastal Freight' },
  { id: '55555555-5555-5555-5555-500000000014', job_number: 'JOB-U014', planned_start: createDate('09:00:00'), planned_end: createDate('13:00:00'), status: 'Unassigned', version: 1, customer_id: 'Northstar' },
  { id: '55555555-5555-5555-5555-500000000015', job_number: 'JOB-U015', planned_start: createDate('12:00:00'), planned_end: createDate('14:00:00'), status: 'Unassigned', version: 1, customer_id: 'Helm Corp' },
  { id: '55555555-5555-5555-5555-500000000016', job_number: 'JOB-U016', planned_start: createDate('16:00:00'), planned_end: createDate('20:00:00'), status: 'Unassigned', version: 1, customer_id: 'Coastal Freight' },
  { id: '55555555-5555-5555-5555-500000000017', job_number: 'JOB-U017', planned_start: createDate('07:00:00'), planned_end: createDate('09:00:00'), status: 'Unassigned', version: 1, customer_id: 'Acme Corp' },
  { id: '55555555-5555-5555-5555-500000000018', job_number: 'JOB-U018', planned_start: createDate('11:00:00'), planned_end: createDate('15:00:00'), status: 'Unassigned', version: 1, customer_id: 'Pacific Logging' },
  { id: '55555555-5555-5555-5555-500000000019', job_number: 'JOB-U019', planned_start: createDate('14:00:00'), planned_end: createDate('17:00:00'), status: 'Unassigned', version: 1, customer_id: 'Helm Corp' },
  { id: '55555555-5555-5555-5555-500000000020', job_number: 'JOB-U020', planned_start: createDate('08:00:00'), planned_end: createDate('12:00:00'), status: 'Unassigned', version: 1, customer_id: 'Northstar' },
];
