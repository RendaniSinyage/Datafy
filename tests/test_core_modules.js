const assert = require('assert');
const Dedupe = require('../linkedin-funding-capture/utils/dedupe.js');
const ExportUtils = require('../linkedin-funding-capture/utils/export.js');
const Detector = require('../linkedin-funding-capture/content/detector.js');
const Extractor = require('../linkedin-funding-capture/content/extractor.js');

console.log('--- Testing Core Modules ---');

// 1. Test Dedupe
console.log('Testing Dedupe...');
const id1 = Dedupe.getPostIdentifier('https://www.linkedin.com/feed/update/urn:li:activity:7123456789/?utm_source=share', 'John Doe', 'Some post text');
assert.strictEqual(id1, 'urn:li:activity:7123456789');

const id2 = Dedupe.getPostIdentifier('', 'Jane Smith', 'Announcing our new grant opportunity for startups!');
assert.strictEqual(id2.startsWith('fp:jane smith::announcing our new grant'), true);

const capturedSet = new Set(['urn:li:activity:7123456789']);
assert.strictEqual(Dedupe.isAlreadyCaptured('https://www.linkedin.com/feed/update/urn:li:activity:7123456789', '', '', capturedSet), true);
assert.strictEqual(Dedupe.isAlreadyCaptured('https://www.linkedin.com/feed/update/urn:li:activity:9999999999', '', '', capturedSet), false);
console.log('✓ Dedupe tests passed');

// 2. Test Detector
console.log('Testing Detector...');
const post1Text = "ABC Foundation is proud to announce $500,000 grant funding applications open for African education startups! Deadline: 30 Nov 2026. Apply now at https://example.com/apply";
const detection1 = Detector.detectOpportunity(post1Text, 5);
console.log('Post 1 score:', detection1.score, 'Matches:', detection1.matches);
assert.strictEqual(detection1.isOpportunity, true);
assert.ok(detection1.score >= 10);

const irrelevanText = "Just had a great coffee with my colleague. Excited for the weekend!";
const detection2 = Detector.detectOpportunity(irrelevanText, 5);
assert.strictEqual(detection2.isOpportunity, false);
assert.strictEqual(detection2.score, 0);
console.log('✓ Detector tests passed');

// 3. Test Extractor
console.log('Testing Extractor...');
const details1 = Extractor.extractOpportunityDetails(post1Text, 'ABC Foundation', 'https://linkedin.com/in/abcfoundation');
assert.strictEqual(details1.opportunityType, 'Grant');
assert.strictEqual(details1.deadline, '30 Nov 2026');
assert.strictEqual(details1.geography, 'Africa');
assert.strictEqual(details1.industry, 'Education');
assert.strictEqual(details1.amount, '$500,000');
assert.strictEqual(details1.currency, 'USD');
console.log('✓ Extractor tests passed');

// 4. Test ExportUtils
console.log('Testing ExportUtils...');
const opps = [
  {
    capturedAt: '2026-03-01T10:00:00Z',
    author: 'ABC Foundation',
    authorProfileUrl: 'https://linkedin.com/company/abc',
    organization: 'ABC Foundation',
    title: 'Grant funding for education',
    opportunityType: 'Grant',
    amount: 'R500,000',
    currency: 'ZAR',
    deadline: '30 Nov 2026',
    eligibility: 'African education startups',
    geography: 'Africa',
    industry: 'Education',
    applicationUrl: 'https://example.com/apply',
    postUrl: 'https://linkedin.com/feed/update/urn:li:activity:123',
    notes: 'Important grant',
    rawText: 'ABC Foundation $500,000 grant...'
  }
];

const csv = ExportUtils.exportToCSV(opps);
console.log('Generated CSV:\n', csv);
assert.ok(csv.includes('"capturedAt","author","authorProfileUrl","organization","title"'));
assert.ok(csv.includes('"ABC Foundation"'));
assert.ok(csv.includes('"R500,000"'));

const json = ExportUtils.exportToJSON(opps);
assert.ok(json.includes('"opportunityType": "Grant"'));
console.log('✓ ExportUtils tests passed');

console.log('--- ALL CORE MODULE TESTS PASSED ---');
