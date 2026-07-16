const buffer = require('buffer');

// Node 25 removed buffer.SlowBuffer, but an older jsonwebtoken dependency
// still expects it during module initialization.
if (typeof buffer.SlowBuffer === 'undefined') {
  buffer.SlowBuffer = buffer.Buffer;
}
