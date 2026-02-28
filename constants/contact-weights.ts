import type { PersonaId } from '../shared/types/persona';

export type ContactSignal =
  | 'owner' | 'operator' | 'manager'
  | 'chief_pilot' | 'dom' | 'scheduler' | 'dispatch'
  | 'cfo' | 'controller' | 'director_aviation'
  | 'executive_assistant'
  | 'email_available' | 'mobile_available';

export const CONTACT_WEIGHTS: Record<PersonaId, Record<ContactSignal, number>> = {
  dealer_broker:         { owner: 30, operator: 25, manager: 20, chief_pilot: 5,  dom: 0,  scheduler: 0,  dispatch: 0,  cfo: 15, controller: 10, director_aviation: 10, executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  fbo:                   { owner: 10, operator: 20, manager: 15, chief_pilot: 20, dom: 10, scheduler: 30, dispatch: 20, cfo: 0,  controller: 0,  director_aviation: 5,  executive_assistant: 10, email_available: 5, mobile_available: 5 },
  mro:                   { owner: 0,  operator: 20, manager: 10, chief_pilot: 25, dom: 35, scheduler: 5,  dispatch: 5,  cfo: 0,  controller: 0,  director_aviation: 15, executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  charter:               { owner: 5,  operator: 30, manager: 25, chief_pilot: 10, dom: 0,  scheduler: 25, dispatch: 20, cfo: 0,  controller: 0,  director_aviation: 5,  executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  fleet_management:      { owner: 25, operator: 25, manager: 20, chief_pilot: 15, dom: 10, scheduler: 5,  dispatch: 5,  cfo: 10, controller: 5,  director_aviation: 10, executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  finance:               { owner: 30, operator: 10, manager: 25, chief_pilot: 0,  dom: 0,  scheduler: 0,  dispatch: 0,  cfo: 25, controller: 20, director_aviation: 5,  executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  catering:              { owner: 0,  operator: 15, manager: 10, chief_pilot: 20, dom: 5,  scheduler: 35, dispatch: 25, cfo: 0,  controller: 0,  director_aviation: 0,  executive_assistant: 20, email_available: 5, mobile_available: 5 },
  ground_transportation: { owner: 5,  operator: 15, manager: 20, chief_pilot: 10, dom: 0,  scheduler: 25, dispatch: 15, cfo: 0,  controller: 0,  director_aviation: 0,  executive_assistant: 30, email_available: 5, mobile_available: 5 },
  detailing:             { owner: 0,  operator: 15, manager: 10, chief_pilot: 20, dom: 30, scheduler: 25, dispatch: 15, cfo: 0,  controller: 0,  director_aviation: 5,  executive_assistant: 0,  email_available: 5, mobile_available: 5 },
};

export const CONFIDENCE_PENALTY_MULTIPLIERS: Record<PersonaId, Record<string, number>> = {
  dealer_broker:         { recommendations: 1.0, contacts: 1.0, companies: 1.0, flightIntel: 0.6, transactionsIntel: 1.0, marketIntel: 1.0 },
  fbo:                   { recommendations: 1.0, contacts: 1.0, companies: 0.8, flightIntel: 1.2, transactionsIntel: 0.4, marketIntel: 0.2 },
  mro:                   { recommendations: 1.0, contacts: 1.0, companies: 1.0, flightIntel: 0.8, transactionsIntel: 0.6, marketIntel: 0.2 },
  charter:               { recommendations: 1.0, contacts: 0.8, companies: 1.0, flightIntel: 1.2, transactionsIntel: 0.4, marketIntel: 0.6 },
  fleet_management:      { recommendations: 1.0, contacts: 0.6, companies: 1.0, flightIntel: 1.0, transactionsIntel: 0.8, marketIntel: 0.8 },
  finance:               { recommendations: 1.0, contacts: 0.6, companies: 1.0, flightIntel: 1.0, transactionsIntel: 1.2, marketIntel: 1.2 },
  catering:              { recommendations: 1.0, contacts: 1.0, companies: 0.6, flightIntel: 1.2, transactionsIntel: 0.2, marketIntel: 0.0 },
  ground_transportation: { recommendations: 1.0, contacts: 1.0, companies: 0.6, flightIntel: 1.2, transactionsIntel: 0.2, marketIntel: 0.0 },
  detailing:             { recommendations: 1.0, contacts: 1.0, companies: 0.6, flightIntel: 1.0, transactionsIntel: 0.2, marketIntel: 0.0 },
};
