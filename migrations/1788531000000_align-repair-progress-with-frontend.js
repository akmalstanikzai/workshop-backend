exports.up = (pgm) => {
  pgm.sql("ALTER TYPE repair_progress ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'diagnosing'");
  pgm.sql("ALTER TYPE repair_progress ADD VALUE IF NOT EXISTS 'completed' AFTER 'ready'");
};

exports.down = () => {};
