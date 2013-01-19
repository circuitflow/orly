"use strict";
$(document).ready(function() {
	var sp = getSpotifyApi();
	var models = sp.require("$api/models");
	var views = sp.require('$api/views');
	var player = models.player;
	var en_api_key = '8MF4B60ASI9QKWMRJ';

    $.ajaxSetup({traditional: true, cache: true});

	// Get the track that is currently playing
	var currentTrack = player.track;

	var currentHTML = document.getElementById('np');
	if (currentTrack == null) {
		currentHTML.innerHTML = 'No track currently playing';
	} else {
		currentHTML.innerHTML = 'Now playing: ' + currentTrack;
	}
    console.log(currentTrack);
    getSampledTrackFromWhoSampled(currentTrack.artists[0], currentTrack.name);

	// getWhoSampledArtistFromEchoNest(en_api_key, currentTrack.artists[0]);
	// getWhoSampledTrackFromEchoNest(en_api_key, currentTrack.artists[0], currentTrack.name);
	
    function getSampledTrackFromWhoSampled(artist, track) {
        
        // track = track.replace("'", '');
        
        track = track.replace('&apos;', "'");
        track = track.replace(/[^a-zA-Z0-9-_ ]/g, '');
        // track = track.replace(/[]/g, ' ');
        track = track.split('-')[0];
        
        console.log(track);
        
        track = encodeURI(track);
        // track = encodeURIComponent(track);
        
        var url = 'http://www.whosampled.com/search/samples/?q=' + track;

        console.log(url);

        $.get(url, function(data) {
            var searchResults = $(data).find('#mainSectionLeft')[0];
            searchResults = $(searchResults).find('div')[5]; // innerContent2
            searchResults = $(searchResults).find('tbody')[0];
            searchResults = $(searchResults).find('tr');
            // console.log(searchResults);
            $(searchResults).each(function(){
                var searchResult = $(this).find('td')[2];
                searchResult = $(searchResult).find('a');
                searchResult = $(searchResult).text();
                console.log(searchResult.split('sample of'));

            });


            // var elements = $(".result").html(data)[0].getElementById('mainSectionLeft');
            // console.log(elements);
            // for(var i = 0; i < elements.length; i++) {
               // var theText = elements[i].firstChild.nodeValue;
               // Do something here
            // }

            // var htmlCode = $(data).;
            // console.log(htmlCode[3]);

            // $('.result').html(data);
            // console.log($('.result'));
            // var results = $('.result').find('mainSectionLeft');
            // console.log(results);
        });
        
    }

    function getCoveredTrackFromWhoSampled(artist, track) {
        var url = 'http://www.whosampled.com/search/covers/?q=' + track;
        console.log(url);
    }

	function getWhoSampledArtistFromEchoNest(api_key, artist) {
        var url = 'http://developer.echonest.com/api/v4/artist/search?api_key=' + api_key + '&callback=?';
        // console.log(artist);

        $.getJSON(url,
            {
                name: artist,
                format: 'jsonp',
                limit: true,
                results: 1,
                bucket: ['id:whosampled']
            },
        function(data) {
            console.log(data);
            if (checkResponse(data)) {
            	var artist_id = data.response.artists[0].foreign_ids[0].foreign_id.split(':')[2];
            	var artist_url = 'http://www.whosampled.com/artist/view/' + artist_id;
				var currentHTML = document.getElementById('artist');
				currentHTML.innerHTML = '<a href="' + artist_url + '">' + artist + '</a>';
            } else {
                $('#error').text("trouble getting results");
            }
        });
    }

    function getWhoSampledTrackFromEchoNest(api_key, artist, title) {
        var url = 'http://developer.echonest.com/api/v4/song/search?api_key=' + api_key + '&callback=?';
        console.log(artist + " - " + title);

        $.getJSON(url,
            {
                artist: artist,
                title: title,
                format: 'jsonp',
                limit: true,
                results: 1,
                bucket: ['id:whosampled', 'tracks']
            },
        function(data) {
            // console.log(data);
            if (checkResponse(data)) {
                var currentHTML = document.getElementById('track');
				currentHTML.innerHTML = data.response.songs[0].tracks[0].foreign_id;
            } else {
                $('#error').text("trouble getting results");
            }
        });
    }

    function checkResponse(data) {
        if (data.response) {
            if (data.response.status.code != 0) {
                $('#error').text("Whoops... Unexpected error from server. " + data.response.status.message);
                console.log(JSON.stringify(data.response));
            } else {
                return true;
            }
        } else {
            error("Unexpected response from server");
        }
        return false;
    }
});
