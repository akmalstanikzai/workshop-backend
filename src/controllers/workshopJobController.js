const resourceController = require('./resourceController');

module.exports = resourceController({
  table: 'workshop_jobs',
  fields: ['customer_name', 'phone', 'equipment', 'service_type', 'issue', 'status', 'estimated_cost', 'payment_status', 'paid_at', 'paid_by'],
  required: ['customer_name', 'equipment', 'service_type', 'issue'],
  userField: 'created_by',
  searchFields: ['job_number', 'customer_name', 'phone', 'equipment', 'issue'],
  hasUpdatedAt: true,
});
