const { executeGoogleWorkspace } = require('./hands/workers/mcp-google-worker');

async function test() {
  try {
    const res = await executeGoogleWorkspace({
      action: 'create_event',
      payload: {
        title: 'Test Meeting',
        start: '2026-05-08T03:00:00+05:30',
        end: '2026-05-08T04:00:00+05:30'
      }
    });
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}

test();
