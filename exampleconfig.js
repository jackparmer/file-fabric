    /* Example of how one might instantiate a FileFabric object */
    
    
    var ffInit = function( containerDiv, postUrl ){
        // retrieve file tree content for FileFabric

        $.post('/'+postUrl+'/', {id:-1}, function(fileJson){
            ffObj = {
                fileJson : fileJson,
                containerDiv : containerDiv,
                columns : [
                    {name: 'Name', key: 'data', onclick: fileNameOnClick, icon: true },
                    {name: 'Sharing', key: 'sharing', cellClasses: ['filetab__permissions'] },
                    {name: 'Shortlink', key: 'shortlink', cellClasses: ['filetab__sharelink'] },
                    {name: 'Created', key: 'created', cellClasses: ['tsrel'], link: false },
                ],
                contextMenu : fileItemContextMenu,
            }
            if( postUrl == 'privatetree' ){
                FF_PRIVATE = new FileFabric( ffObj );
            }
            else{
                FF_SHARED = new FileFabric( ffObj );
            }
        });
    };

    ffInit( $('.js-files-tree-container-private')[0], 'privatetree' );
    ffInit( $('.js-files-tree-container-shared')[0], 'sharedtree' );
