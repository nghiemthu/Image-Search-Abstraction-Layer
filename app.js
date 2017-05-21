var mongoose = require("mongoose");
var express = require('express');
var app = express();
app.set("view engine", "ejs");

var request = require('request');
mongoose.connect("mongodb://thunghiem:123456@ds149201.mlab.com:49201/img-search");

var historySchema = new mongoose.Schema({
    term: String,
    when: String
});

var History = mongoose.model("history", historySchema);

//Homepage
app.get("/index", function(req, res){
    res.render("index");
});

app.get("/latest", function(req, res){
    History.find({}, function(err, histories){
        if (err) throw err;
        
        var result=[];
        for(var i=histories.length-1; i>=0; i--){
            result.push(histories[i]);
        }
        
        res.send(result);
    });
});

//History.find({}).remove().exec();

//Get data
app.get("/:keyword", function(req, res){
    var keyword = req.params.keyword.replace('%20', ' ');
    var offset = 0;
    
    if (req.query.offset != null) offset = req.query.offset;
    
    request(getRequest(keyword, offset), function(error, response, body){
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            var result = [];
            
            // Loop through all items and get url, snippet, thumnail and context
            info.value.forEach(function(val){
                var item = {
                              'url': val.contentUrl,
                              'snippet': val.name,
                              'thumbnail': val.thumbnailUrl,
                              'context': val.hostPageUrl
                            };
                result.push(item);
            });
            
            // Find all and remove the first item if there are more than 10 items
            History.find({}, function(err, histories){
                if (err) throw err;
                else {
                    // Remove if more than 10
                    if (histories.length >= 10) {
                        History.find({ _id: histories[0]._id }).remove().exec();
                    };
                    
                    if (keyword !== 'favicon.ico') {
                        //Save to database
                        History.create({
                            term: keyword,
                            when: new Date()
                        },function(err, url){
                            if (err) throw err;
                        });
                    }
                }
            });
            
            //Send data
            res.send(result);
        } else res.send('Error');
    });
});

function getRequest(keyword, offset){
    var url = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=' + keyword + '&count=10&offset=' + offset + '&mkt=en-us&safeSearch=Moderate';
    return  {
        url,
        headers: {
            'Ocp-Apim-Subscription-Key': 'd4f2553c5feb4774a4d5242ce4e0c912'
        }
    };
}

// Start server
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server stated!");
});