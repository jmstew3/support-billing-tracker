/**
 * Centralized pricing configuration for the application
 * All pricing rates and tiers should be managed from this single source
 */

export interface PricingTier {
  name: string;
  rate: number; // Rate per hour in dollars
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROMOTION';
  description: string;
}

export interface PricingConfig {
  tiers: PricingTier[];
  defaultHoursPerRequest: number;
}

export const PRICING_CONFIG: PricingConfig = {
  tiers: [
    {
      name: 'Promotion',
      rate: 125,
      urgency: 'PROMOTION',
      description: 'Promotional pricing'
    },
    {
      name: 'Low',
      rate: 150,
      urgency: 'LOW',
      description: 'Standard turnaround time'
    },
    {
      name: 'Medium',
      rate: 175,
      urgency: 'MEDIUM',
      description: 'Same day service'
    },
    {
      name: 'High',
      rate: 250,
      urgency: 'HIGH',
      description: 'Immediate attention required'
    }
  ],
  defaultHoursPerRequest: 0.5
};

// Helper function to get rate by urgency
export function getRateByUrgency(urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROMOTION'): number {
  const tier = PRICING_CONFIG.tiers.find(t => t.urgency === urgency);
  return tier?.rate || PRICING_CONFIG.tiers[1].rate; // Default to LOW (regular) rate
}

// Helper function to get tier name by urgency
export function getTierNameByUrgency(urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROMOTION'): string {
  const tier = PRICING_CONFIG.tiers.find(t => t.urgency === urgency);
  return tier?.name || 'Regular Support';
}

// Export individual rates for backward compatibility
export const RATES = {
  promotion: PRICING_CONFIG.tiers.find(t => t.urgency === 'PROMOTION')?.rate || 125,
  regular: PRICING_CONFIG.tiers.find(t => t.urgency === 'LOW')?.rate || 150,
  sameDay: PRICING_CONFIG.tiers.find(t => t.urgency === 'MEDIUM')?.rate || 175,
  emergency: PRICING_CONFIG.tiers.find(t => t.urgency === 'HIGH')?.rate || 250
};

export const DEFAULT_HOURS = PRICING_CONFIG.defaultHoursPerRequest;

// Free support hours policy (starting June 2025)
export const FREE_HOURS_PER_MONTH = 10;
export const FREE_HOURS_START_DATE = '2025-06'; // YYYY-MM format

// Free landing page policy (starting June 2025)
export const FREE_LANDING_PAGES_PER_MONTH = 1;
export const FREE_LANDING_PAGE_START_DATE = '2025-06'; // YYYY-MM format