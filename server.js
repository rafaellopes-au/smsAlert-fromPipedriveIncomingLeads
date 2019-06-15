require('dotenv').config() //process.env.
const express = require('express')
const app = express()
var request = require('request');
var moment = require("moment");
var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('./client_secret.json');
const port = 8080

// Create a document object using the ID of the spreadsheet - obtained from its URL.
var doc = new GoogleSpreadsheet(process.env.spreadsheet_id);
// Authenticate with the Google Spreadsheets API.
doc.useServiceAccountAuth(creds, function (err) {
});


function calculateDays(startDate,endDate) {
   var start_date = moment(startDate, 'YYYY-MM-DD HH:mm:ss');
   var end_date = moment(endDate, 'YYYY-MM-DD HH:mm:ss');
   var duration = moment.duration(end_date.diff(start_date));
   var days = duration.asMinutes();
   return days;
}


app.get('/filter/:id', (req, res) => {
  var date = new Date();
  var now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
  var date1 = new Date(now_utc);
  var dateTimeNow = `${date1.getUTCFullYear()}-${date1.getUTCMonth()+1}-${date1.getUTCDate()} ${date1.getUTCHours()}:${date1.getUTCMinutes()}:${date1.getUTCSeconds()}`

    var requesturl    = `https://${req.params.pipedriveUser}.pipedrive.com/v1/deals?`
          requesturl += `filter_id=${req.params.id}`
          requesturl += `&stage_id=${process.env.stage_id}`
          requesturl += `&status=${process.env.status}`
          requesturl += `&start=${process.env.start}`
          requesturl += `&limit=${process.env.limit}`
          requesturl += `&api_token=${process.env.api_token}`

          //console.log(requesturl)

    request(requesturl, function (error, response, body) {
      if (error) console.log('error:', error); // Print the error if one occurred
      result = JSON.parse(body).data
      var funcs = [];

        function createfunc(dueid, duetitle, duecompany, duecontact, ownername, dueMinutes, stagechangetime) {
          return function() {
            if (dueMinutes >= 15 && dueMinutes <= 60 && stagechangetime == null) {
              // Get all of the rows from the spreadsheet.
              doc.getRows(1, function (err, rows) {

              firstTime=0;
              for (var i = 0; i < rows.length; i++) {
                  // console.log(rows[i].dueid, rows[i].addtime, rows[i].duetitle, rows[i].duecompany, rows[i].duecontact)
                   if (dueid==rows[i].dueid) {++firstTime}
              }
              if (firstTime == 0 || (firstTime == 1 && dueMinutes >= 30)) {
                    console.log("count line" + firstTime)
                    console.log(">> " + dueid)
                    var data = { "dueid": dueid,
                                 "addtime": dateTimeNow,
                                 "duetitle": duetitle,
                                 "duecompany": duecompany,
                                 "duecontact": duecontact,
                                 "ownername": ownername
                    }
                    doc.addRow(1, data, function(err) {
                       if(err) {
                         console.log(err);
                       }
                    });
                    //console.log(data)
              }

              });

          }
        }
        }
        if (result != null) {
         for (var j = 0; j < result.length; j++) {
           dueMinutes = calculateDays(result[j].add_time, dateTimeNow)
           console.log(`${result[j].id}:It was oppend ${dueMinutes} minutes ago`)
           funcs[j] = createfunc(result[j].id, result[j].title, result[j].org_name, result[j].person_name, result[j].owner_name, dueMinutes, result[j].stage_change_time)
         }
         for (var i = 0; i < result.length; i++) {
                funcs[i]();
         }
         }
    });
res.send('Reading/Processing Pipedrive data!')
})

app.get('/RemoveOldData', (req, res) => {

  var date = new Date();
  var now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
  var date1 = new Date(now_utc);
  var dateTimeNow = `${date1.getUTCFullYear()}-${date1.getUTCMonth()+1}-${date1.getUTCDate()} ${date1.getUTCHours()}:${date1.getUTCMinutes()}:${date1.getUTCSeconds()}`

  doc.getRows(1, function (err, rows) {
    for (var i = 0; i < rows.length; i++) {
      console.log("dueid: " + rows[i].dueid + " add_time: " + rows[i].addtime);
      if (calculateDays(rows[i].addtime, dateTimeNow) >= 1440) {
        rows[i].del(console.log("removed! " + rows[i].dueid))
      }
    }
  })
  res.send("Remove Old Data")
})

app.listen(port, () => console.log(`App is listening on port ${port}!`))
