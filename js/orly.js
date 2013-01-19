"use strict";
$(document).ready(function() {
	var sp = getSpotifyApi();
	var models = sp.require("$api/models");
	var views = sp.require('$api/views');
	var player = models.player;
	var en_api_key = '52HAPO5HSDDRQLLJT';
    var currentTrack = player.track;

	var currentSongTitleHTML = document.getElementById('current-song-title');
    var currentArtistNameHTML = document.getElementById('current-artist-name');
    var currentAlbumartHTML = document.getElementById('albumart');
    var sampledSourceTracksHTML = document.getElementById('sampled-source-tracks');
    var sampledDerivativeTracksHTML = document.getElementById('sampled-derivative-tracks');
    var coveredSourceTracksHTML = document.getElementById('covered-source-tracks');
    var coveredDerivativeTracksHTML = document.getElementById('covered-derivative-tracks');

    $.ajaxSetup({traditional: true, cache: true});
    
    models.player.observe(models.EVENT.CHANGE, function(event) {
        if (event.data.curtrack == true) {
            // updatePageWithTrackDetails();
        }
    });

    models.application.observe(models.EVENT.ACTIVATE, function(event) {
        // updatePageWithTrackDetails();
    });

    $('#get-playing-track').click(function(e){
        updatePageWithTrackDetails();

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
    });

    function updatePageWithTrackDetails() {
        currentTrack = player.track;
        if (currentTrack == null) {
            currentSongTitleHTML.innerHTML = 'No track currently playing';
            currentArtistNameHTML.innerHTML = '';
            currentAlbumartHTML.innerHTML = '';
        } else {
            // console.log(currentTrack);
            currentSongTitleHTML.innerHTML = currentTrack.name;
            currentArtistNameHTML.innerHTML = currentTrack.artists[0].name;
            currentAlbumartHTML.innerHTML = '';
            addPlayer(currentTrack, currentAlbumartHTML);
        }
    }

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
            // console.log(data);
            
            clearResults(relationType);

            var derivatives = data.derivative;
            var sources = data.source;
            for (var track in derivatives)
                searchForTrack(derivatives[track]['sourceArtist'], derivatives[track]['sourceTrack'], sourcesContainer);
            for (var track in sources)
                searchForTrack(sources[track]['derivativeArtist'], sources[track]['derivativeTrack'], derivativesContainer);
        }
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

                addPlayer(track, container, true);
        

            }
        });

        search.appendNext();
    }

    function addPlayer(track, container, hasName) {
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

        if (hasName) {
            var trackInfo = document.createElement('div');
            var nameSpan = document.createElement('span');
            nameSpan.innerHTML = '<b>' +track.artists[0].name + '</b><br>' + track.name;
            trackInfo.appendChild(nameSpan);
            trackDiv.appendChild(trackInfo);
            $(trackDiv).addClass('result');

            container.appendChild(trackDiv);
                        
            var clearDiv = document.createElement('div');
            $(clearDiv).addClass('clear');
            container.appendChild(clearDiv);
        }
        else{
            container.appendChild(trackDiv);
        }



    }

    function clearResults(relationType) {
        if (relationType == 'sample') {
            sampledSourceTracksHTML.innerHTML = '';
            try {
                sampledDerivativeTracksHTML.innerHTML = '';
            } catch (e) {
                console.log(e);
            }
        } else if (relationType == 'cover') {
            coveredSourceTracksHTML.innerHTML = '';
            try {
                coveredDerivativeTracksHTML.innerHTML = '';    
            } catch (e) {
                console.log(e);
            }
        }
    }
});
