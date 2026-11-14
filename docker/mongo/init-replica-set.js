// Healthcheck of the `mongo` service (run by mongosh).
// The API uses transactions, which require a replica set. On the first start
// this initiates a single-node replica set; on later starts the configuration
// already lives in the data volume and nothing is changed.
// Exits with 0 only when this node is the writable primary.
try {
  rs.status();
} catch (error) {
  if (error.codeName !== 'NotYetInitialized') throw error;
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] });
}

if (!db.hello().isWritablePrimary) quit(1);
