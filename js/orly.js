"use strict";
$(document).ready(function() {
	var sp = getSpotifyApi();
	var models = sp.require("$api/models");
	var views = sp.require('$api/views');
	var player = models.player;
	var en_api_key = '52HAPO5HSDDRQLLJT';
    var currentTrack = player.track;
    var currentHTML = document.getElementById('np');
    var sampledSourceTracksHTML = document.getElementById('sampled-source-tracks');
    var sampledDerivativeTracksHTML = document.getElementById('sampled-derivative-tracks');
    var coveredSourceTracksHTML = document.getElementById('covered-source-tracks');
    var coveredDerivativeTracksHTML = document.getElementById('covered-derivative-tracks');

    $.ajaxSetup({traditional: true, cache: true});

    updatePageWithTrackDetails();

    models.player.observe(models.EVENT.CHANGE, function(event) {
        if (event.data.curtrack == true) {
            // updatePageWithTrackDetails();
        }
    });

    models.application.observe(models.EVENT.ACTIVATE, function(event) {
        updatePageWithTrackDetails();
    });

    $('#get-playing-track').click(function(e){
        console.log("button click");
        updatePageWithTrackDetails();
    });

    function updatePageWithTrackDetails() {
        currentTrack = player.track;
        if (currentTrack == null) {
            currentHTML.innerHTML = 'No track currently playing';
        } else {
            currentHTML.innerHTML = 'Now playing: ' + currentTrack;
        }
    }

    // getWhoSampledArtistFromEchoNest(en_api_key, currentTrack.artists[0].name);
    // getWhoSampledTrackFromEchoNest(en_api_key, currentTrack.artists[0], currentTrack.name);

    getTrackFromWhoSampled(
        'sample',
        currentTrack.artists[0].name,
        currentTrack.name,
        handleFromWhoSampled('sample', sampledSourceTracksHTML, sampledDerivativeTracksHTML)
    );
    getTrackFromWhoSampled(
        'cover',
        currentTrack.artists[0].name,
        currentTrack.name,
        handleFromWhoSampled('cover', coveredSourceTracksHTML, coveredDerivativeTracksHTML)
    );

    function getTrackFromWhoSampled(searchType, artist, track, callback) {
        var results = {
            'source':[],
            'derivative':[],
            'unknown':[],
            'searchType': searchType
        };

        // console.log(artist);
        // console.log(track);

        var searchArtist = encodeURI($.trim(artist.replace('&apos;', "'").replace(/[^a-zA-Z0-9-_ ]/g, '').split('-')[0]));
        var searchTrack = encodeURI($.trim(track.replace('&apos;', "'").replace(/[^a-zA-Z0-9-_ ]/g, '').split('-')[0]));


        var url = 'http://www.whosampled.com/search/' + searchType + 's/?q=' + searchArtist + '%20' + searchTrack;
        console.log(url);

        $.get(url, function(data) {
            var searchResults = $(data).find('#mainSectionLeft')[0];
            searchResults = $(searchResults).find('div')[5]; // innerContent2
            searchResults = $(searchResults).find('tbody')[0];
            searchResults = $(searchResults).find('tr');

            $(searchResults).each(function(){
                var relation = {};

                var searchResult = $(this).find('td')[2];
                searchResult = $(searchResult).find('a');
                searchResult = $(searchResult).text();

                if (searchResult) {
                    var splitKey = searchType + ' of'
                    searchResult = searchResult.split(splitKey);

                    var derivative = searchResult[0].split(/'s/);
                    relation['derivativeArtist'] = $.trim(derivative.shift().split('feat.')[0]);
                    relation['derivativeTrack'] = $.trim(derivative.join("'s"));

                    var source = searchResult[1].split(/'s/);
                    relation['sourceArtist'] = $.trim(source.shift().split('feat.')[0]);
                    relation['sourceTrack'] = $.trim(source.join("'s"));

                    if (relation.sourceArtist.indexOf(artist) > -1 || artist.indexOf(relation.sourceArtist) > -1) {
                        results.source.push(relation);
                    } else if (relation.derivativeArtist.indexOf(artist) > -1 || artist.indexOf(relation.derivativeArtist) > -1) {
                        results.derivative.push(relation);
                    } else {
                        results.unknown.push(relation);
                    }
                }
            });
            if ($.isFunction(callback)) callback(results);
        });

    }

    function handleFromWhoSampled(relationType, sourcesContainer, derivativesContainer) {
        return function(data) {
            console.log(data);
            var derivatives = data.derivative;
            var sources = data.source;
            for (var track in derivatives)
                searchForTrack(derivatives[track]['sourceArtist'], derivatives[track]['sourceTrack'], sourcesContainer);
            for (var track in sources)
                searchForTrack(sources[track]['derivativeArtist'], sources[track]['derivativeTrack'], derivativesContainer);
        }
    }

    function getCoveredTrackFromWhoSampled(artist, track) {
        var url = 'http://www.whosampled.com/search/covers/?q=' + track;
        console.log(url);
    }


	function getWhoSampledArtistFromEchoNest(api_key, artist) {
        var url = 'http://developer.echonest.com/api/v4/artist/search?api_key=' + api_key + '&callback=?';
        $.getJSON(url,
            {
                name: artist,
                format: 'jsonp',
                limit: true,
                results: 1,
                bucket: ['id:whosampled']
            },
        function(data) {
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

    function searchForTrack(artist, track, container) {
        var searchString = artist + ' - ' + track;
        // console.log("Search for", searchString);
        var search = new models.Search(searchString);
        search.localResults = models.LOCALSEARCHRESULTS.APPEND;

        search.observe(models.EVENT.CHANGE, function() {
            var results = search.tracks;
            var fragment = document.createDocumentFragment();
            if (results.length > 0) {
                var track = results[0];
                // console.log(track.uri, track.name);
                // console.log(track);

                // create playlist with track
                var single_track_playlist = new models.Playlist();
                single_track_playlist.add(track);

                // create single track player
                var single_track_player = new views.Player();
                single_track_player.track = null; // Don't play the track right away
                single_track_player.context = single_track_playlist;

                // wrap in div with name, etc
                var trackDiv = document.createElement('div');
                trackDiv.appendChild(single_track_player.node);
                var nameSpan = document.createElement('span');
                nameSpan.innerHTML = track.artists[0].name + ' - ' + track.name;
                trackDiv.appendChild(nameSpan);

                container.appendChild(trackDiv);
                // console.log(trackDiv);
            }
        });

        search.appendNext();
    }
});
