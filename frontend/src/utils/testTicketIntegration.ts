import { getMockTickets } from '../services/twentyApi';
import { transformTicketToRequest } from './ticketTransform';

// Test the integration
export function testTicketIntegration() {
  console.log('🎫 Testing Ticket Integration...');

  // Get mock tickets
  const mockTickets = getMockTickets();
  console.log('Mock Tickets:', mockTickets);

  // Test transformation of a single ticket
  const sampleTicket = {
    fsCreationDate: '2025-09-23',
    subject: 'Test Integration',
    priority: 'CRITICAL' as const,
    category: 'BRAND_WEBSITE_TICKET' as const,
    integrationProvider: 'FLUENT' as const,
  };

  const transformed = transformTicketToRequest(sampleTicket);
  console.log('Transformed Ticket:', transformed);

  // Verify the transformation is correct
  const checks = {
    hasSource: transformed.source === 'ticket',
    hasCorrectCategory: transformed.Category === 'Support',
    hasCorrectUrgency: transformed.Urgency === 'HIGH',
    hasCorrectHours: transformed.EstimatedHours === 1.0,
    hasCorrectStatus: transformed.Status === 'active',
  };

  console.log('Integration Check Results:', checks);

  const allPassed = Object.values(checks).every(v => v === true);
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');

  return { mockTickets, transformed, checks };
}