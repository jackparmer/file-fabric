        /* Example of how one might instantiate a FileFabric object */
    
        $.post('/'+postUrl+'/', {id:-1}, function(fileJson){
            ffObj = {
                fileJson : fileJson,
                containerDiv : containerDiv,
                columns : [
                    {name: 'Name', key: 'data', template: ffTemplate.fileName, onclick: fileNameOnClick, },
                    {name: 'Preview', key: 'imgurl', template: ffTemplate.preview },
                    {name: 'Sharing', key: 'sharing' },
                    {name: 'Shortlink', key: 'shortlink', template: ffTemplate.shortlink },
                    {name: 'Created', key: 'created', cellClasses: 'tsrel' },
                ],
                contextMenu : fileItemContextMenu,
                changeFolder : toggleLoadMoreBtn,
            }
            if( postUrl == 'privatetree' ){
                FF_PRIVATE = new FileFabric( ffObj );
            }
            else{
                FF_SHARED = new FileFabric( ffObj );
            }
            setTimeout(function(){ fileFabricCleanUp( containerDiv ) }, 800);
        });
