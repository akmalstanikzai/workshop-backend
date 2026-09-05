const ROLES = ['admin', 'data_entry', 'cashier', 'telecom_engineer', 'power_engineer'];

exports.up = (pgm) => {
  pgm.addColumns('users', {
    password_hash: { type: 'text' },
    role: { type: 'varchar(30)', notNull: true, default: 'data_entry' },
    is_active: { type: 'boolean', notNull: true, default: true },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('users', 'users_role_check', {
    check: `role IN (${ROLES.map((role) => `'${role}'`).join(', ')})`,
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('users', 'users_role_check');
  pgm.dropColumns('users', ['password_hash', 'role', 'is_active', 'updated_at']);
};
