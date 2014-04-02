/*	filefabric.js
	lightweight, JSON --> HTML file table converter with folder navigation
	feb 11 2013
	jack parmer
	wherever you go, there you are
	*/

function FileFabric( initObj ){
	/* 	main FileFabric class
		row data, columns, and container div are stored here
		build the FileFabric html <table> foundation
		accepted keys for initObj
		... fileJson		JSON string of file structure, see readme for structure
		... columns			Array column objects
		... containerDiv	HTML div in which to build table */

	/* ----------------------- */
	/* --- PRIVATE MEMBERS --- */
	/* ----------------------- */

	var _createFileTable = function(){
		// private function to add HTML file table to DOM
		// TODO: Templatize the HTML somehow? 
		// TODO: Provide an API for alternative HTML structures?

		var _data = that._data;						// table row data
		var _cols = that._cols;						// table column data
		var _containerDiv = that._containerDiv;		// table container div
		var tableHtml;								// inner contents of <table>
		var tableEl;								// <table> DOM element
		var tableBody								// where the table rows go
		var firstContainerChild;					// first element in container div (if any)
		var navBar;									// <div> for navigational breadcrumbs

		var _tableHeader = function( _cols ){
			// return HTML for table header <th> elements
			var tblHeader = document.createElement('THEAD');	// table header element to be returned
			var headerRow = document.createElement('TR');		// table header row
			var col;											// a single column object
			var downArrow;										// HTML for downwards menu caret
			var headerCell;										// a single header <TH> element
			var headerDiv;										// DIV that wraps header contents

			headerRow.appendChild( document.createElement('TH') );

			for( var i=0; i < _cols.length; i++ ){
				// add table header elements one-by-one
				col = _cols[i];
				headerCell = document.createElement('TH');
				headerDiv = document.createElement('DIV');
				headerDiv.className = 'ff-header-content';
				if( col.onHeaderClick !== undefined ){
					// This header can be clicked!
					downArrow = '<div class="ff-dd-arrow"></div>';
					headerCell.className = 'ff-header-menu';
					headerCell.setAttribute('data-key',col.key);
					headerDiv.innerHTML = (['<div>',col.name,'</div>','<div class="ff-dd-arrow"></div>']).join('');
					headerDiv.addEventListener('click', col.onHeaderClick);
				}
				else{
					headerDiv.innerHTML = (['<div>',col.name,'</div>']).join('');
				}
				headerCell.appendChild( headerDiv );
				headerRow.appendChild( headerCell );
			}

			tblHeader.appendChild( headerRow );			
			return tblHeader;
		};

		var _navBar = function(){
			// return DIV container for folder navigation bar
			var d = document.createElement( 'DIV' );
			d.className = 'ff-nav-bar js-ff-nav-bar';
			return d;
		};

		var _insertTableRows = function( tableEl, _data ){
			// dynamically add <tr> row nodes to table

			var node; // single row object

			if( _data.length == 0 && that._emptyFolder !== undefined ){
				that.makeAnnouncement( that._emptyFolder );
			}

			for( var i=0; i < _data.length; i++ ){
				node = _data[i];
				_appendRow( node, tableEl );
			}
		};

		tableEl = document.createElement('TABLE');
		tableEl.className = 'ff-table';

		tableEl.appendChild( _tableHeader(_cols) );
		tableEl.appendChild( document.createElement('TBODY') );

		firstContainerChild = initObj.containerDiv.firstChild;
		navBar = _navBar();
		if( firstContainerChild === null ){
			initObj.containerDiv.appendChild(navBar);
			initObj.containerDiv.appendChild(tableEl);
		}
		else{
			initObj.containerDiv.insertBefore(navBar,firstContainerChild);
			initObj.containerDiv.insertBefore(tableEl,firstContainerChild);
		}

		// draw breadcrumbs
		_drawBreadcrumbs();

		// insert column rows
		tableBody = initObj.containerDiv.getElementsByTagName('tbody')[0];
		_insertTableRows( tableBody, _data['ff-root'] );
	}

	var _changeFolder = function( e ){
		// callback to clicking breadcrumb element "el"
		// precursor to calling public member showFolder()

		var el = e.target;									// navigational breadcrumb that clicked
		var folderId = el.getAttribute( 'data-id' );		// id of folder
		var fileJson = that._data[folderId];				// row data for folder
		var folderName = el.innerText || el.textContent;	// name of folder
		var folderObj = {									// folder object ot pass to showFolder()
				containerDiv: that._containerDiv,
				folderId: folderId,
				folderName: folderName,
				fileJson: fileJson
			};

		// update instance's breadcrumb object
		for( var i=0; i < that._breadcrumbs.length; i++ ){
			var crumb = that._breadcrumbs[i];
			if( crumb.id == folderId ){
				that._breadcrumbs = that._breadcrumbs.slice( 0, i );
				break;
			}	
		}

		that.showFolder( folderObj );
	}

	var _addCheckBox = function( xtraCls ){
		// return HTML for an unchecked checkbox
		// xtra_cls is an extra class to add to the checkbox div
		if( xtraCls === undefined ) xtraCls = '';
		return '<div class="ff-checkbox ff-unchecked ' + xtraCls + '"></div>';
	}

	var _defaultCellTemplate = function( col, node ){
		// returns string in 
		return node[ col['key'] ];
	}

	var _appendCell = function( row, col, node ){
		// insert a cell node <td> into table row

		var cellHtml = node[col['key']];		// text for cell
		var newCell = row.insertCell(-1);		// cell DOM element
		var cellLink;							// link <a> inside cell
		var icon;								// string for icon (<i>) HTML

		newCell.setAttribute( 'data-key', col['key'] );
		if( 'template' in col ){
			newCell.innerHTML = (col['template']).apply(that,[node]);
		}
		else{
			newCell.innerHTML = _defaultCellTemplate( col, node );	
		}

		if( 'onCellClick' in col ){
			cellLink = newCell.getElementsByTagName('a')[0];
			if( cellLink !== undefined ){
				cellLink.addEventListener( 'click', col['onCellClick'], false );
				cellLink.setAttribute('data-dismiss','modal');
				if( that._contextMenu !== undefined ){ 
					cellLink.addEventListener('contextmenu', that._contextMenu, false);
				}
			}
		}

		if( 'cellClasses' in col ){
			newCell.className = col['cellClasses'];
		}
	}

	var _selectAll = function( el ){
		// search outwards from the row element el for the closest selected row
		// if one is found, select all rows in-between

		var foundRow = false;	// has the next closest selected row been found?
		var rowsUp = [];		// row collected traversing upwards
		var rowsDown = [];		// " ... " downwards
		var rowUp = el;			// Next row upwards
		var rowDown = el;		// " ... " downwards
		var travelUp = true;	// Was the selected row found upwards or downwards?

		do{
			// get next row up
			if( rowUp !== null ){
				rowUp = rowUp.previousSibling;
				if( rowUp !== null ){
					rowsUp.push( rowUp );
					if( rowUp.className.indexOf( 'ff-selected' ) >=0 ){
						foundRow = true;				
					}
				}
			}

			// get next row down
			if( rowDown !== null ){
				rowDown = rowDown.nextSibling;
				if( rowDown !== null ){
					rowsDown.push( rowDown );
					if( rowDown.className.indexOf( 'ff-selected' ) >= 0 ){
						foundRow = true;
						travelUp = false;
					}				
				}
			}
		}
		while( foundRow == false && ( ( rowUp !== null ) || ( rowDown !== null ) ) );

		if( foundRow ){
			var rowsToSelect = ( travelUp ) ? rowsUp : rowsDown;

			for( var i=0; i < rowsToSelect.length; i++ ){
				_toggleRow( rowsToSelect[i], true );
			}
		}
	}

	var _checkboxOnClick = function(e){
		// onclick handler to deselect checkboxes
		var el = e.target;
	}

	var _rowOnClick = function( e ){
		// callback to clicking on a row element (<tr>)

		var el = e.target;					// clicked element
		var selectRow = true;				// whether to select or deselect the row
		var row = that.parentRow( el );		// clicked row (parent in DOM of el)
		var cls;							// class string of row (<tr>), looking for ff-selected class

		if( row == false ){ return }		

		cls = row.className;

		if( cls.indexOf( 'ff-selected' ) >= 0 ){
			selectRow = false;
		}

		_toggleRow( row, selectRow );

		// handle shift-key selections
		if( selectRow && e.shiftKey ){ _selectAll( row ); }

		_updateCheckboxStatus();
	}

	var _toggleRow = function( row, selectRow ){
		// add or remove "ff-selected" class to <tr> "row"
		// set selectRow to Boolean true to select the row
		// and false to deselect

		var checkbox = row.getElementsByClassName('ff-checkbox')[0];	// checkbox div belonging to row

		var _toggleCheckbox = function( el, drawCheckbox ){
			// swap old class for new class on a single checkbox element
			// classes are ff-checked and ff-unchecked

			var oldCls = 'ff-checked' 
			var newCls = 'ff-unchecked';

			if( drawCheckbox ){
				oldCls = 'ff-unchecked';
				newCls = 'ff-checked';			
			}

			el.className = el.className.replace(oldCls, newCls);
		}		
		
		if( selectRow ){
			row.className = row.className + ' ff-selected';
		}
		else{
			var regex = new RegExp( 'ff-selected', 'g' );
			row.className = row.className.replace( regex, '' );
		}

		_toggleCheckbox( checkbox, selectRow );
	}

	var _drawBreadcrumbs = function(){
		// draw breadcrumbs in nav bar
		// called on every folder change

		var _breadcrumbs = that._breadcrumbs;
		var _containerDiv = that._containerDiv;
		var navBar = _containerDiv.getElementsByClassName('js-ff-nav-bar')[0];		
		var checkAllDiv = document.createElement('DIV');

		navBar.innerHTML = '';

		checkAllDiv.innerHTML = _addCheckBox('js-check-all');
		checkAllDiv.innerHTML = checkAllDiv.getElementsByTagName('DIV')[0].outerHTML;
		checkAllDiv.addEventListener( 'click', that.toggleCheckboxes );
		navBar.appendChild( checkAllDiv );		// checkbox for selecting all rows

		for( var i=0; i < _breadcrumbs.length; i++ ){
			var crumb = _breadcrumbs[i],
				crumbWrapper = document.createElement('span'),
				crumbLink = document.createElement('A'),
				crumbText = crumb[ 'name' ].substring(0,9);

			if( crumbText.length = 10 ){ crumbText += '...'; }

			crumbLink.setAttribute('href','#')
			crumbLink.setAttribute('data-id',crumb['id']);
			crumbLink.innerHTML = crumb[ 'name' ];
			crumbLink.addEventListener( 'click', _changeFolder, false );
			crumbWrapper.appendChild( crumbLink );

			navBar.appendChild( crumbWrapper );
		}
	}

	var _appendRow = function( node, tableEl, position ){
		// insert a row node <tr> into table element tableEl
		// node = single file object
		// tableEl = HTML tbody element
		// position = optional, 'first' to prepend row, 'last' to append row

		var newRow;							// new row <tr> element
		var checkboxCell;					// cell <tr> element containing checkbox
		var _cols = that._cols;				// column specification object	

		that.unannounce();

		if( position == 'first' ){
			console.log( 'prepending row(s): ', node, tableEl );
		}

		if( position != 'first' ) position = 'last';

		if( position == 'last' ){
			newRow = tableEl.insertRow(-1);
		}
		else{
			try{
				newRow = tableEl.insertRow(0);
			}
			catch(e){
				console.log( 'couldnt insert row at pos 0, trying pos 1' );
				newRow = tableEl.insertRow(1);
			}
		}

		newRow.className = 'ff-table-row';
		newRow.setAttribute( 'draggable', true );
		newRow.addEventListener('click', _rowOnClick, false);

		if( that._contextMenu !== undefined ){ 
			newRow.addEventListener('contextmenu', _contextMenu, false);
		}

		var attrKeys = Object.keys(node.attr);
		for( var i = 0; i < attrKeys.length; i++ ){
			newRow.setAttribute( attrKeys[i], node.attr[ attrKeys[i] ]);
		}

		// add checkbox cell

		checkboxCell = newRow.insertCell(-1);
		checkboxCell.innerHTML = _addCheckBox();
		checkboxCell.addEventListener('click', _checkboxOnClick, false);

		for( var j = 0; j < _cols.length; j++ ){
			_appendCell( newRow, _cols[j], node, j );
		}
	}

	var _contextMenu = function( e ){
		// select row and call context menu handler
		var el = e.target,
			row = that.parentRow( el );

		_toggleRow( row, true );

		that._contextMenu( e, row, that._containerDiv );
	}

	var _updateCheckboxStatus = function(){
		// compares the number of selected rows to the number of rows total
		// and update elements with class 'js-check-all' accordingly

		var allRows = that._containerDiv.querySelectorAll('tr.ff-table-row').length;
		var selectedRows = that.getCheckedItems().length;
		var checkboxStates = ['ff-checked', 'ff-unchecked', 'ff-partial'];
		var selectAllControllers = that._containerDiv.getElementsByClassName( 'js-check-all' );
		var controller;
		var state;
		var regex;

		if( selectedRows == 0 ){
			state = 'ff-unchecked';
		}
		else if( allRows == selectedRows ){
			state = 'ff-checked';
		}
		else if( selectedRows < allRows ){
			state = 'ff-partial';
		}

		checkboxStates.splice( checkboxStates.indexOf( state ), 1 );

		for( var i=0; i<selectAllControllers.length; i++ ){
			// Iterate through all elements that control global row selection

			// Add class to controller element
			controller = selectAllControllers[i];
			if( controller.className.indexOf(state) < 0 ){
				// don't add the same class name twice
				controller.className = ([controller.className, state]).join(' ');
			}

			// Remove other classes from controller element
			for( var j=0; j<checkboxStates.length; j++ ){
				regex = new RegExp( checkboxStates[j], 'g' );
				controller.className = controller.className.replace( regex, '' );
			}
		}	
	}

	/* ---------------------- */
	/* --- PUBLIC MEMBERS --- */
	/* ---------------------- */

	this.parentRow = function( el ){
		// return parent <tr> element of element el, or false
		var count = 0;

		if( el.tagName!=='TR' && el.className.indexOf('ff-table-row')<0 ){
			do{
				el = el.parentNode;
				count++;
			}while( el.className.indexOf('ff-table-row')<0 && count<1000 )
		}	

		if( count >= 1000 ) return false; // didn't find a parent row
		return el;
	}

	this.showFolder = function( folderObj ){
		// Clear table row <tr> contents and show new folder files
		// accpeted keys for folderObj
		// ... fileJson		JSON string of files in folder
		// ... folderId		unique id of folder
		// ... folderName

		var node;			
		var _cols = that._cols;
		var tableEl = that._containerDiv.getElementsByTagName('tbody')[0];		

		try{
			var newData = JSON.parse( folderObj.fileJson );
		} catch(e){
			var newData = folderObj.fileJson;
		}

		if( newData === undefined ){
			console.log( 'showFolder found no file data to display' );
			return false;
		}

		// clear table contents
		console.log( 'showFolder-->clearing tableEl', tableEl );
		tableEl.innerHTML = '';

		console.log()
		if( newData.length == 0 && that._emptyFolder !== undefined ){
			that.makeAnnouncement( that._emptyFolder );
		}

		// add new rows for folder
		for( var i = 0; i < newData.length; i++ ){
			node = newData[i];
			_appendRow( node, tableEl );
		}

		// update breadcrumb
		that._breadcrumbs.push( { name: folderObj.folderName, id: folderObj.folderId } );
		_drawBreadcrumbs();

		// add folder data to folder cache
		that._data[ folderObj.folderId ] = newData;

		if( that._changeFolder !== undefined ){ 
			that._changeFolder(that);
		}		
	}

	this.retrieveFolder = function( fid ){
		// retrieve a folder if its been cached
		// otherwise, return false
		if( fid in that._data ){
			return that._data[ fid ];
		}
		else{
			return false;
		}
	}

	this.renameCell = function( fid, key, txt ){
		// rename text contents of a table cell
		// parameters are:
		// fid --> file id of item (row)
		// key --> column id of item
		// txt --> new name for cell

		// first, change name text in the DOM
		var cells = document.getElementById(fid).getElementsByTagName('TD');

		for( var i=0; i<cells.length; i++ ){
			var cell = cells[i];
			if( cell.getAttribute('data-key') == key ){ 
				break; 
			}
		}

		if( cell.getElementsByTagName('A').length > 0 ){
			cell = cell.getElementsByTagName('A')[0];
		}

		var icon = '';
		if( cell.getElementsByTagName('I').length > 0 ){
			icon = cell.getElementsByTagName('I')[0];
		}

		cell.innerHTML = icon.outerHTML + txt;

		// second, update this._data with the new name
		var currentFolderId = this._breadcrumbs[ this._breadcrumbs.length-1 ].id;
		for( var j=0; j < this._data[currentFolderId].length; j++ ){
			if( this._data[currentFolderId][j].attr.id == fid ){
				this._data[currentFolderId][j][key] = txt;
			}
		}
	}

	this.getCheckedItems = function(){
		// return all selected DOM rows
		return that._containerDiv.querySelectorAll('tr.ff-selected');
	}

	this.moveCheckedItems = function( pid ){
		// move checked items to folder with parent id pid, then remove them from the DOM
		var rows = that.getCheckedItems();											// selected file items
		var currentFolderId = that._breadcrumbs[ that._breadcrumbs.length-1 ].id;	// folder in which user is currently looking
		var loadedFolders = Object.keys(that._data);								// folder ids that have been loaded in File Fabric
		var row;		// single File Fabric row in HTML representation
		var rowData;	// single File Fabric row in data representation
		var rowFid		// single file id from selected row
		var dataFid;	// single file id from FF data object

		console.log( 'moving ' + rows.length + ' rows to parent with id ' + pid );
		console.log( 'pid: ', pid, 'current folder id: ', currentFolderId );

		if( pid == currentFolderId ) return; // parent folder is same as current folder, nothing to move

		if( ( pid in loadedFolders )  === false ) that._data[pid] = []; // add parent folder to File Fabric data object

		for( var i=0; i < rows.length; i++ ){
			row = rows[i];
			rowFid = row.getAttribute('id');
			for( var j=0; j < that._data[currentFolderId].length; j++ ){
				dataFid = that._data[currentFolderId][j].attr.id;
				if( rowFid == dataFid ){
					console.log( 'found item to move', rowFid );
					rowData = that._data[currentFolderId].splice(j,1)	// remove row data from open folder
					rowData = rowData[0];								// splice() returns an array
					console.log( 'moving row data', rowData );
					that._data[pid].push( rowData );					// add row data to destination folder
					j=j-1;												// re-index due to splice
				}
			}
			row.parentNode.removeChild(row);							// remove row from DOM
		}
	}

	this.removeCheckedItems = function(){
		// remove selected rows from FileFabric object and the DOM (remove table row elements)
		var rows = that.getCheckedItems();
		var currentFolderId = that.getCurrentFolder().id;
		var row;
		var fid;

		for( var i=0; i < rows.length; i++ ){
			row = rows[i];
			fid = row.getAttribute('id');
			for( var j=0; j < that._data[currentFolderId].length; j++ ){
				if( that._data[currentFolderId][j].attr.id == fid ){
					that._data[currentFolderId].splice(j,1)			// remove row from _data object
					j=j-1;											// re-index due to splice
				}
			}
			row.parentNode.removeChild(row);						// remove row from DOM
		}
	}

	this.addItems = function( fileJson, position ){
		// add rows to the root of the file tree
		// fileJson --> unparsed JSON
		// position --> optional, 'first' to preprend items at beginning of folder

		var tableEl = that._containerDiv.getElementsByTagName('tbody')[0];
		var fileItem;											// a single file item to add to folder
		var folder = that._data[ that.getCurrentFolder().id ];	// the folder getting items added to it

		if( position === undefined ) position = 'last';

		fileJson = JSON.parse( fileJson );

		for( var i=0; i < fileJson.length; i++ ){
			fileItem = fileJson[i];
			if( position == 'last' ){
				folder.push( fileItem );	// Add item to data object
			}
			else{
				folder.unshift( fileItem );
			}
			_appendRow( fileItem, tableEl, position );						// Add item to HTML view
		}
	}

	this.setItemAttributes = function( id, attributes ){
		// set  attributes for a single item with id "id"
		// attributes is an object of key-value pairs

		var loadedFolders = that._data;					// Folders loaded to client, including root folder
		var folderItems;								// An array of file items within a folder
		var item;										// A single item within a folder
		var domItem;									// Item's representation in DOM
		var folderKeys = Object.keys( loadedFolders );	// Keys to folder arrays
		var attrKeys = Object.keys( attributes );		// all attribute keys
		var key;										// single attribute key 
		var val;										// single attribute val

		// First, set attribute in DOM
		domItem = document.getElementById( id );
		for( var i=0; i < attrKeys.length; i++ ){
			key = attrKeys[i];
			val = attributes[key];
			domItem.setAttribute( key, val );
		}		

		// Second, update item object in FileFabric
		var searchForNode = function( folderKey, i, arr ){
			itemsInFolder = that._data[ folderKey ];
			for (var j = itemsInFolder.length - 1; j >= 0; j--) {
				item = itemsInFolder[j];
				if( item['attr']['id'] == id ){
					for( var i=0; i < attrKeys.length; i++ ){
						key = attrKeys[i];
						val = attributes[key];
						item['attr'][key] = val;
						return;
					}
				}
			};
		};

		console.log( 'search for nodes to set attributes' );
		folderKeys.forEach( searchForNode );	

		return;
	}

	this.redrawOne = function( newNode ){
		// redraw a table row given a new node and update the _data object

		var tbl = document.createElement('TABLE');		// Dummy table to create row within
		var nodeId = newNode.attr.id;
		var oldRow = document.getElementById( nodeId );
		var newRow;
		var oldNode;

		if( oldRow === null ){
			console.log( 'redrawOne() tried to redraw a file item with id '+ nodeId +' that does not exist, calling addItems()' );
			that.addItems( JSON.stringify([newNode]), 'first' );
			return false;
		}

		// Redraw row in DOM
		_appendRow( newNode, tbl );
		newRow = tbl.getElementsByTagName('TR')[0];			// Does this work?
		// console.log('redrawOne --> newRow', newRow);
		oldRow.parentNode.replaceChild( newRow, oldRow );

		// Replace node in _data
		oldNode = that.getItemsByAttribute('id', nodeId)[0];
		// console.log( 'redrawOne ---> oldNode', oldNode, 'new node', newNode );
		oldNode = newNode;
	}

	this.createOrUpdateOne = function( node, position ){
		// given a single node object, create it if it does not exist; update it if it does
		// only updates the node attrributes, not the row cells. use redrawOne() to redraw cells
		// node --> node object
		// position --> where to append node in tree if creating it, either "first" or "last"
		console.log('FF --> createOrUpdateOne');

		if( position === undefined ){ position = 'first'; } 

		var nodeId = node.attr.id;
		var nodeAttributes = node.attr;
		var nodeExists = false;
		var tableEl = that._containerDiv.querySelectorAll('table.ff-table')[0].getElementsByTagName('tbody')[0];
		var rootFolder = that._data[ 'ff-root' ];
		var matchingNode;

		// does this node exist?
		matchingNode = that.getItemsByAttribute( 'id', nodeId );
		nodeExists = Boolean( matchingNode.length );

		console.log( 'createOrUpdateOne --> ', node, position, matchingNode );

		if( nodeExists ){
			that.setItemAttributes( nodeId, nodeAttributes );
		}
		else{
			rootFolder.unshift( node );
			_appendRow( node, tableEl, position );
		}

		console.log( 'returning from createOrUpdateOne' );
	}

	this.getItemsByAttribute = function( key, val ){
		// return all loaded rows with attribute 'key' having value 'val'
		// for example, ffObj.getItemsByAttribute( 'class', 'hello' )
		// returns all rows having class 'hello'

		var loadedFolders = that._data;					// Folders loaded to client, including root folder
		var folderItems;								// An array of file items within a folder
		var item;										// A single item within a folder
		var folderKeys = Object.keys( loadedFolders );	// Keys to folder arrays
		var matchingNodes = [];							// nodes have attributes 'key' with value 'val'

		var collectNodes = function( folderKey, i, arr ){
			folderItems = that._data[ folderKey ];
			for (var j = folderItems.length - 1; j >= 0; j--) {
				item = folderItems[j];
				if( item['attr'][key] == val ){
					matchingNodes.push( item );
				}
			};
		};

		folderKeys.forEach( collectNodes );

		return matchingNodes;
	}

	this.getCurrentFolder = function(){
		// returns the id and name of the current folder in view in an object with keys 'id' and 'name'
		// the root folder has a reserved id, which is "ff-root"
		return that._breadcrumbs[ that._breadcrumbs.length-1 ];
	}

	this.toggleCheckboxes = function(){
		// click event listener for "select all" checkbox
		// behavior:
		// no rows are selected --> select all rows
		// all rows are selected --> deselect all rows
		// some rows are selected --> deselect all rows

		console.log( 'toggle all checkboxes' );

		var numCheckboxes = that.getCheckedItems().length;

		if( numCheckboxes == 0 ){
			that.selectAllItems();
		}
		else{
			that.selectAllItems( false );
		}
	}

	this.selectAllItems = function( state ){
		// select or deselect all rows
		// state --> true to select all rows; false to deselect rows

		if( state === undefined ) state = true;

		var allRows = that._containerDiv.querySelectorAll('tr.ff-table-row');
		var checkEl;

		for( var i=0; i<allRows.length; i++ ){
			// iterate through all rows and select them
			_toggleRow( allRows[i], state );
		}

		_updateCheckboxStatus();
	}

	this.makeAnnouncement = function( template ){
		// Add a row with a cell that spans all of the columns
		// "template" is a template function that returns html for cell contents

		var colspan = that._cols.length + 1;
		var tblBody = that._containerDiv.getElementsByTagName('tbody')[0];
		var messageRow = tblBody.insertRow(0);
		var messageCell = document.createElement('TD');

		that.unannounce(); // remove any previous announcement

		messageRow.className = 'ff-announcement';
		messageCell.setAttribute( 'colspan', colspan );
		messageCell.innerHTML = template( that );

		messageRow.appendChild( messageCell );
	}

	this.unannounce = function(){
		// remove announcement row from table DOM

		var	announcements = that._containerDiv.getElementsByClassName('ff-announcement');
		var singleAnnouncement;
		var parent;

		for( var i=0; i<announcements.length; i++ ){
			singleAnnouncement = announcements[i];
			parent = singleAnnouncement.parentNode;
			parent.removeChild( singleAnnouncement );
		}
	} 

	this.getColumnKeys = function(){
		// return a flast array of all column identifier strings, one for each column

		var keys = [];	// list of identifiers for all columns

		for( var i=0; i<that._cols.length; i++ ){
			keys.push( that._cols[i].key );
		}	

		return keys;
	}

	this.addFilter = function( colKey, filterKeyword, behavior ){
		// add a column filter to FF's filter object
		// columnKey --> column identifier string
		// filterKeyword --> a unique string identifying filter 
		// ... (unique meaning no other columns have the same filter string)
		// behavior --> either "exclusive" or "inclusive", defaults to "inclusive"
		// ... "exclusive" filters are stored separately from inclusive ones and denote
		// ... filters that are mutually-exclusive (like radio-button selections)

		var keys = that.getColumnKeys();						// column IDs for all columns
		var headerElem = that._containerDiv
				.querySelectorAll('TH[data-key='+colKey+']')[0];	// column header element (<TH>)

		if( behavior === undefined ){ behavior = 'inclusive'; }

		if( keys.indexOf( colKey ) < 0 ){  
			throw { name: 'File Fabric', message: 'Column ID does not exist.' };
		}

		if( that._columnFilters[ colKey ] === undefined ){ 
			that._columnFilters[ colKey ] = { 'exclusive':[], 'inclusive':[] }; 
		}

		if( behavior == 'exclusive' ){ that._columnFilters[ colKey ][behavior] = []; }

		that._columnFilters[ colKey ][behavior].push( filterKeyword );

		// add active class to header element
		if( headerElem.className.indexOf('ff-active-header') < 0 ){
			headerElem.className += ' ff-active-header';
		}
	}

	this.removeFilter = function( colKey, filterKeyword ){
		// remove a filter from a column by its identifying string

		var filterTypes = ['inclusive','exclusive']
		var ft;				// "filter type", either exclusive or inclusive
		var filterIndex;	// index of matching filter string
		var headerElem;		// <TH> elem of column
		var regex;			// regex for replacing header class names

		for( i in filterTypes ){
			ft = filterTypes[i];
			filterIndex = ( that._columnFilters[ colKey ][ ft ] ).indexOf( filterKeyword );
			if( filterIndex > -1 ){
				( that._columnFilters[ colKey ][ ft ] ).splice(filterIndex, 1);
			}	
		}

		if( that.getAllFilters().length == 0 ){
			headerElem = that._containerDiv
				.querySelectorAll('TH[data-key='+colKey+']')[0];	// column header element (<TH>)
			regex = new RegExp( 'ff-active-header', 'g' );			
			headerElem.className = headerElem.className.replace( regex, '' );
		}	
	}

	this.getAllFilters = function(){
		// returns a flat list of all column filters in the columnFilters object

		var filterStrings = [];									// filter strings for all columns
		var columnKeys = Object.keys( that._columnFilters );	// identifiers for all columns that have filters
		var columnFilters;										// filter string object for a single column

		for( var i=0; i<columnKeys.length; i++ ){
			columnFilters = that._columnFilters[ columnKeys[i] ];
			filterStrings = filterStrings.concat( columnFilters['inclusive'], columnFilters['exclusive'] );
		}

		return filterStrings;
	}

	/* ---------------------------- */
	/* --- OBJECT INSTANTIATION --- */
	/* ---------------------------- */

	var that = this;

	this._data = {};
	this._data['ff-root'] = JSON.parse( initObj.fileJson );
	this._cols = initObj.columns;
	this._containerDiv = initObj.containerDiv;
	this._breadcrumbs = [ {id: 'ff-root', name:'Home'} ];
	this._contextMenu = initObj.contextMenu;
	this._changeFolder = initObj.changeFolder;
	this._emptyFolder = initObj.emptyFolder;
	this._columnFilters = {};

	_createFileTable();
}
