# flume replicate

Adventures with data redundancy

This is simple primary -> follower replication. 

```js
var S = require('pull-stream')
var Flume = require('flumedb')
var Log = require('flumelog-memory')

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
```

The log entries need to be in the same order in the stream as they are in  `db1`, because the flumelog-\* modules control creating the sequence number.

This replication is *asynchronous*. After you write to db1, there is no guarantee if or when it will be backed up in db2. The sequence is exposed on `db.since`, an observable, so you could check there if the two dbs are at the same state.

How would you implement synchronous replication? You would need to do it at the flumelog-\* level, because that's where you callback after writing.

If you want to automate it more, you could create a stream that sends a first message with the latest sequence number. Two replication streams can then be piped together, and when each db gets the others seq, they can decide whether they are sending or receiving data.

In that situation you would still have a primary/follower db, because if both db's are being written to, you could have inconsistent state. if you have multiple primary dbs, you would also need a conflict resolution method.


