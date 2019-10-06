const EventEmitter = require('events')

class ReplayEvents extends EventEmitter() {
  constructor(params) {
    
  }
}

const replayEmitter = new ReplayEvents()

replayEmitter.on('took_snapshot',(uuid) =>{
  console.log('ReplayEvents - Event - took_snapshot')
})
