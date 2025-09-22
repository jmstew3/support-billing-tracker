/**
 * Centralized pricing configuration for the application
 * All pricing rates and tiers should be managed from this single source
 */

export interface PricingTier {
  name: string;
  rate: number; // Rate per hour in dollars
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface PricingConfig {
  tiers: PricingTier[];
  defaultHoursPerRequest: number;
}

export const PRICING_CONFIG: PricingConfig = {
  tiers: [
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
export function getRateByUrgency(urgency: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  const tier = PRICING_CONFIG.tiers.find(t => t.urgency === urgency);
  return tier?.rate || PRICING_CONFIG.tiers[0].rate; // Default to regular rate
}

// Helper function to get tier name by urgency
export function getTierNameByUrgency(urgency: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  const tier = PRICING_CONFIG.tiers.find(t => t.urgency === urgency);
  return tier?.name || 'Regular Support';
}

// Export individual rates for backward compatibility
export const RATES = {
  regular: PRICING_CONFIG.tiers.find(t => t.urgency === 'LOW')?.rate || 150,
  sameDay: PRICING_CONFIG.tiers.find(t => t.urgency === 'MEDIUM')?.rate || 175,
  emergency: PRICING_CONFIG.tiers.find(t => t.urgency === 'HIGH')?.rate || 250
};

export const DEFAULT_HOURS = PRICING_CONFIG.defaultHoursPerRequest;