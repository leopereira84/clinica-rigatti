import { describe, expect, it } from 'vitest';
import { describeTarget } from '../src/seed/describeTarget.js';

describe('describeTarget', () => {
  it('shows only the scheme and the database name', () => {
    const uri = 'mongodb+srv://seed-user:s3cr%40t@cluster0.abcde.mongodb.net/clinica_rigatti?retryWrites=true&w=majority';
    const described = describeTarget(uri);

    expect(described).toBe('mongodb+srv://<hidden host>/clinica_rigatti');
    for (const secret of ['seed-user', 's3cr', 'cluster0', 'mongodb.net', 'retryWrites']) {
      expect(described).not.toContain(secret);
    }
  });

  it('handles URIs without credentials or database name', () => {
    expect(describeTarget('mongodb://127.0.0.1:27017/catalog')).toBe('mongodb://<hidden host>/catalog');
    expect(describeTarget('mongodb://127.0.0.1:27017')).toBe('mongodb://<hidden host>/(default database)');
    expect(describeTarget('mongodb://localhost/?replicaSet=rs0')).toBe('mongodb://<hidden host>/(default database)');
  });
});
