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

    var sampledSourceTracksFound = false;
    var sampledDerivativeTracksFound = false;
    var coveredSourceTracksFound = false;
    var coveredDerivativeTracksFound = false;

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
        sampledSourceTracksFound = false;
        sampledDerivativeTracksFound = false;
        coveredSourceTracksFound = false;
        coveredDerivativeTracksFound = false;
        
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
            currentSongTitleHTML.innerHTML = currentTrack.name;
            currentArtistNameHTML.innerHTML = currentTrack.artists[0].name;
            currentAlbumartHTML.innerHTML = '';
            addPlayer(currentAlbumartHTML, currentTrack);
        }
    }

    function getTrackFromWhoSampled(searchType, artist, track, callback) {
        var results = {
            'source':[],
            'derivative':[],
            'unknown':[],
            'searchType': searchType
        };

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
                    console.log(searchResult);
                    searchResult = searchResult.split(splitKey);

                    var derivative = searchResult[0].split(/'s/);
                    console.log(derivative);
                    relation['derivativeArtist'] = $.trim(derivative.shift().split('feat.')[0]);
                    relation['derivativeTrack'] = $.trim(derivative.join("'s"));

                    var source = searchResult[1].split(/'s/);
                    console.log(source);
                    relation['sourceArtist'] = $.trim(source.shift().split('feat.')[0]);
                    relation['sourceTrack'] = $.trim(source.join("'s"));

                    if (relation.sourceArtist.toLowerCase().indexOf(artist.toLowerCase()) > -1 || artist.toLowerCase().indexOf(relation.sourceArtist.toLowerCase()) > -1) {
                        results.source.push(relation);
                    } else if (relation.derivativeArtist.toLowerCase().indexOf(artist.toLowerCase()) > -1 || artist.toLowerCase().indexOf(relation.derivativeArtist.toLowerCase()) > -1) {
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
            clearResults(relationType);

            var derivatives = data.derivative;
            var sources = data.source;

            for (var track in derivatives) {
                searchForTrack(derivatives[track]['sourceArtist'], derivatives[track]['sourceTrack'], sourcesContainer);
            }
            for (var track in sources) {
                searchForTrack(sources[track]['derivativeArtist'], sources[track]['derivativeTrack'], derivativesContainer);
            }
        }
    }

    function searchForTrack(artist, track, container) {
        var searchString = artist + ' - ' + track;
        var search = new models.Search(searchString);
        // search.localResults = models.LOCALSEARCHRESULTS.IGNORE;

        search.observe(models.EVENT.CHANGE, function() {
            var results = search.tracks;
            var fragment = document.createDocumentFragment();
            if (results.length > 0) {
                var track = results[0];
                addPlayer(container, track, true);
            }
        });

        search.appendNext();
    }

    function addPlayer(container, track, hasName) {
        switch (container.id) {
            case 'sampled-source-tracks':
                if (!sampledSourceTracksFound) {
                    sampledSourceTracksFound = true;
                    container.innerHTML = '';
                }
            break;
            case 'sampled-derivative-tracks':
                if (!sampledDerivativeTracksFound) {
                    sampledDerivativeTracksFound = true;
                    container.innerHTML = '';
                }
            break;
            case 'covered-source-tracks':
                if (!coveredSourceTracksFound) {
                    coveredSourceTracksFound = true;
                    container.innerHTML = '';
                }
            break;
            case 'covered-derivative-tracks':
                if (!coveredDerivativeTracksFound) {
                    coveredDerivativeTracksFound = true;
                    container.innerHTML = '';
                }
            break;
        }

        // create playlist with track
        var single_track_playlist = new models.Playlist();
        single_track_playlist.add(track);

        // create single track player
        var single_track_player = new views.Player();
        single_track_player.track = null; // Don't play the track right away
        single_track_player.context = single_track_playlist;

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
            sampledSourceTracksHTML.innerHTML = 'No tracks found.';
            try {
                sampledDerivativeTracksHTML.innerHTML = 'No tracks found.';
            } catch (e) {
                console.log(e);
            }
        } else if (relationType == 'cover') {
            coveredSourceTracksHTML.innerHTML = 'No tracks found.';
            try {
                coveredDerivativeTracksHTML.innerHTML = 'No tracks found.';
            } catch (e) {
                console.log(e);
            }
        }
    }
});
