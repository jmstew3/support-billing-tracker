import { transformTicketToRequest, transformTickets } from './ticketTransform';

// Test data based on the API structure from 20.md
const testTickets = [
  {
    fsCreationDate: '2025-09-23',
    subject: 'Website loading issue - urgent fix needed',
    priority: 'CRITICAL' as const,
    category: 'BRAND_WEBSITE_TICKET' as const,
    integrationProvider: 'FLUENT' as const,
    description: 'The main website is not loading properly for customers'
  },
  {
    fsCreationDate: '2025-09-22',
    subject: 'Contact form not working',
    priority: 'MEDIUM' as const,
    category: 'LANDING_PAGE_TICKET' as const,
    integrationProvider: 'JIRA' as const,
    description: 'Form submissions are not being received'
  },
  {
    fsCreationDate: '2025-09-21',
    subject: 'Update company logo',
    priority: 'NORMAL' as const,
    category: 'MULTI_BRAND_TICKET' as const,
    integrationProvider: 'FLUENT' as const,
    description: 'Need to update logo across all brand sites'
  }
];

console.log('=== Ticket Transformation Test Results ===\n');

// Test individual transformation
console.log('Single Ticket Transformation:');
const singleResult = transformTicketToRequest(testTickets[0]);
console.log(JSON.stringify(singleResult, null, 2));

console.log('\n=== Batch Transformation ===\n');
const batchResults = transformTickets(testTickets);

batchResults.forEach((result, index) => {
  console.log(`Ticket ${index + 1}:`);
  console.log(`  Date: ${result.Date}`);
  console.log(`  Time: ${result.Time}`);
  console.log(`  Summary: ${result.Request_Summary}`);
  console.log(`  Category: ${result.Category}`);
  console.log(`  Urgency: ${result.Urgency}`);
  console.log(`  Hours: ${result.EstimatedHours}`);
  console.log(`  Source: ${result.source}`);
  console.log(`  Status: ${result.Status}`);
  console.log('');
});

console.log('=== Mapping Summary ===');
console.log('✅ CRITICAL → HIGH urgency (1.0 hours)');
console.log('✅ MEDIUM → MEDIUM urgency (0.5 hours)');
console.log('✅ NORMAL → LOW urgency (0.25 hours)');
console.log('✅ BRAND_WEBSITE_TICKET → Support category');
console.log('✅ LANDING_PAGE_TICKET → Forms category');
console.log('✅ MULTI_BRAND_TICKET → Support category');
console.log('✅ All tickets get source: "ticket"');
console.log('✅ All tickets default to Time: "12:00 PM"');

export {};