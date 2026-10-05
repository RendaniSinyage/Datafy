const assert = require('assert');
const Dedupe = require('../linkedin-funding-capture/utils/dedupe.js');
const ExportUtils = require('../linkedin-funding-capture/utils/export.js');
const Detector = require('../linkedin-funding-capture/content/detector.js');
const Extractor = require('../linkedin-funding-capture/content/extractor.js');
const StorageManager = require('../linkedin-funding-capture/storage/opportunities.js');

console.log('====================================================');
console.log('   LINKEDIN FUNDING CAPTURE - FULL TEST SUITE      ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. Detector Tests
runTest('Detector: High relevance grant post scores >= threshold', () => {
  const postText = `
    Global Climate Foundation is excited to launch our $250,000 Grant Opportunity!
    Applications open today for early-stage climate tech startups in Africa and Europe.
    Non-dilutive funding. Deadline: 15 December 2026.
    Apply now at https://climatefoundation.org/grant-apply
  `;
  const result = Detector.detectOpportunity(postText, 5);
  assert.strictEqual(result.isOpportunity, true);
  assert.ok(result.score >= 15);
  assert.ok(result.matches.includes('grant opportunity'));
  assert.ok(result.matches.includes('applications open'));
});

runTest('Detector: Accelerator opportunity detection', () => {
  const postText = `
    TechStars Accelerator accepting applications for our 2026 Winter Cohort!
    $120k seed funding + 3 months mentorship for AI startups.
    Apply for program before closing date 30 Oct 2026.
  `;
  const result = Detector.detectOpportunity(postText, 5);
  assert.strictEqual(result.isOpportunity, true);
  assert.ok(result.matches.includes('accelerator accepting applications'));
});

runTest('Detector: Irrelevant normal post is correctly rejected', () => {
  const postText = `
    Had an incredible team offsite meeting in Cape Town today!
    So grateful to work with such amazing engineers and designers.
    #culture #teamwork #gratitude
  `;
  const result = Detector.detectOpportunity(postText, 5);
  assert.strictEqual(result.isOpportunity, false);
  assert.strictEqual(result.score, 0);
});

// 2. Extractor Tests
runTest('Extractor: Classifies Grant, extracts amount, deadline, geography, and industry', () => {
  const postText = `
    ABC Innovation Fund - $500,000 Grant Opportunity for African Edtech Startups.
    Deadline: 30 Nov 2026. Non-dilutive seed funding.
    Apply here: https://abc.org/apply
  `;
  const details = Extractor.extractOpportunityDetails(postText, 'ABC Fund');
  assert.strictEqual(details.opportunityType, 'Grant');
  assert.strictEqual(details.amount, '$500,000');
  assert.strictEqual(details.currency, 'USD');
  assert.strictEqual(details.deadline, '30 Nov 2026');
  assert.strictEqual(details.geography, 'Africa');
  assert.strictEqual(details.industry, 'Edtech');
  assert.strictEqual(details.applicationUrl, 'https://abc.org/apply');
});

runTest('Extractor: Classifies Venture Capital, extracts ZAR amount', () => {
  const postText = `
    Naspers Foundry announces R5,000,000 investment opportunity for Fintech entrepreneurs.
    Venture capital funding open call for series A companies.
    Due date: 2026-12-31.
  `;
  const details = Extractor.extractOpportunityDetails(postText, 'Naspers Foundry');
  assert.strictEqual(details.opportunityType, 'Venture Capital');
  assert.strictEqual(details.amount, 'R5,000,000');
  assert.strictEqual(details.currency, 'ZAR');
  assert.strictEqual(details.deadline, '2026-12-31');
  assert.strictEqual(details.industry, 'Fintech');
});

runTest('Extractor: Handles missing post author gracefully', () => {
  const postText = `Call for applications: $100,000 Competition prize for AI startups.`;
  const details = Extractor.extractOpportunityDetails(postText, '');
  assert.strictEqual(details.opportunityType, 'Competition');
  assert.strictEqual(details.amount, '$100,000');
  assert.strictEqual(details.organization, '');
});

// 3. Dedupe Tests
runTest('Dedupe: Post URL normalization and activity URN extraction', () => {
  const url1 = 'https://www.linkedin.com/feed/update/urn:li:activity:7890123456/?utm_source=linkedin&utm_medium=feed';
  const norm1 = Dedupe.normalizeUrl(url1);
  assert.strictEqual(norm1, 'urn:li:activity:7890123456');

  const id1 = Dedupe.getPostIdentifier(url1, 'Author A', 'Text A');
  assert.strictEqual(id1, 'urn:li:activity:7890123456');
});

runTest('Dedupe: Fallback fingerprint when URL is unavailable', () => {
  const id = Dedupe.getPostIdentifier('', 'VC Partner', 'Announcing new $10M fund for startups.');
  assert.strictEqual(id, 'fp:vc partner::announcing new $10m fund for startups.');
});

runTest('Dedupe: isAlreadyCaptured correctly checks Set, Array, and Object', () => {
  const key = 'urn:li:activity:11111';
  assert.strictEqual(Dedupe.isAlreadyCaptured('https://www.linkedin.com/feed/update/urn:li:activity:11111', '', '', new Set([key])), true);
  assert.strictEqual(Dedupe.isAlreadyCaptured('https://www.linkedin.com/feed/update/urn:li:activity:11111', '', '', [key]), true);
  assert.strictEqual(Dedupe.isAlreadyCaptured('https://www.linkedin.com/feed/update/urn:li:activity:11111', '', '', { [key]: true }), true);
  assert.strictEqual(Dedupe.isAlreadyCaptured('https://www.linkedin.com/feed/update/urn:li:activity:22222', '', '', new Set([key])), false);
});

// 4. ExportUtils Tests
runTest('ExportUtils: Export to JSON generates valid parseable JSON', () => {
  const items = [{ id: '1', title: 'Grant Test', opportunityType: 'Grant' }];
  const json = ExportUtils.exportToJSON(items);
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].title, 'Grant Test');
});

runTest('ExportUtils: Export to CSV correctly formats headers and escapes special characters', () => {
  const items = [{
    capturedAt: '2026-03-01T12:00:00Z',
    author: 'Author "Special" Name',
    authorProfileUrl: 'https://linkedin.com/in/special',
    organization: 'Org, Inc.',
    title: 'Title with \n newline and "quotes"',
    opportunityType: 'Grant',
    amount: 'R1,000,000',
    currency: 'ZAR',
    deadline: '31 Dec 2026',
    eligibility: 'Open to all',
    geography: 'Global',
    industry: 'SaaS',
    applicationUrl: 'https://example.com',
    postUrl: 'https://linkedin.com/posts/123',
    notes: 'Test note',
    rawText: 'Raw text "quoted"'
  }];

  const csv = ExportUtils.exportToCSV(items);
  assert.ok(csv.includes('"capturedAt","author"'));
  assert.ok(csv.includes('"Author ""Special"" Name"'));
  assert.ok(csv.includes('"Title with \n newline and ""quotes"""'));
});

// 5. StorageManager Interface Tests
runTest('StorageManager: Returns default settings and empty arrays when chrome.storage is absent', async () => {
  const settings = await StorageManager.getSettings();
  assert.strictEqual(settings.threshold, 5);
  assert.strictEqual(settings.autoCapture, true);

  const opps = await StorageManager.getOpportunities();
  assert.deepStrictEqual(opps, []);

  const keys = await StorageManager.getCapturedKeys();
  assert.deepStrictEqual(keys, []);
});

console.log(`\n====================================================`);
console.log(`   TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`====================================================\n`);
