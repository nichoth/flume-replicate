var S = require('pull-stream')
var cat = require('pull-cat')
var Deferred = require('pull-defer').source
var Abortable = require('pull-abortable')
var Flume = require('flumedb')
var Log = require('flumelog-memory')
var Replicate = require('../')

var db = Flume(Log())
var db2 = Flume(Log())

// stream db1
S(
    db.stream({ live: true }),
    S.log()
)

// stream db2
S(
    db2.stream({ live: true }),
    S.drain(function (ev) {
        console.log('db2: ', ev)
    })
)

// add some stuff to db1
var items = [
    { foo: 'bar' },
    { baz: 'bla' },
    { clam: 'gnar' }
]

items.forEach(function (obj) {
    db.append(obj, function (err, seq) {
        if (err) console.log('in here', err)
    })
})

// copy to db2
S(
    db.stream({ gt: db2.since.value, live: true }),
    S.drain(function onEvent (ev) {
        db2.append(ev.value, function (err, seq) {
            // console.log('append', err, seq)
        })
    }, function onEnd (err) {
        console.log('end', err)
    })
)

db.append({ livetest: 'test' }, function () {})


