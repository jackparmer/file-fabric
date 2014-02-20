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
		... fileKson		JSON string of file structure, see readme for structure
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
		var tableHead = '<table class="ff-table">';	// beginning of <table> HTML string
		var tableEl;								// <table> DOM element

		var _tableHeader = function( _cols ){
			// return HTML for table header <th> elements
			var headerHtml = ([
					'<thead>'
					, _navBar(),
					, '<tr><th>'
					, _addCheckBox('js-check-all')
					, '</th>']).join('');			// HTML for table header
			var col;								// a single column object

			for( var i=0; i < _cols.length; i++ ){
				// add table header elements one-by-one
				col = _cols[i];
				headerHtml = headerHtml + (['<th>',col.name,'</th>']).join('');
			}

			return headerHtml+'</th></thead>';
		};

		var _navBar = function(){
			// return HTML for folder navigation bar
			return '<div class="ff-nav-bar js-ff-nav-bar"></div>';
		};

		var _insertTableRows = function( tableEl, _data ){
			// dynamically add <tr> row nodes to table

			var node; // single row object

			for( var i=0; i < _data.length; i++ ){
				node = _data[i];
				_appendRow( node, tableEl, that._cols );
			}
		};

		tableHead = tableHead + ([
			_tableHeader( _cols )
			, '<tbody></tbody>'
			, '</table>']).join('');

		initObj.containerDiv.innerHTML = tableHead;

		// draw breadcrumbs
		_drawBreadcrumbs();

		// insert column rows
		tableEl = initObj.containerDiv.getElementsByTagName('tbody')[0];
		_insertTableRows( tableEl, _data['ff-root'] );
	}

	var _changeFolder = function( e ){
		// callback to clicking breadcrumb element "el"
		// precursor to calling public member showFoloder()

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

	var _appendCell = function( row, col, node, j ){
		// insert a cell node <td> into table row

		var cellHtml = node[col['key']];		// text for cell
		var newCell = row.insertCell(-1);		// cell DOM element
		var cellLink;							// link <a> inside cell
		var icon;								// string for icon (<i>) HTML

		newCell.setAttribute( 'data-key', col['key'] );

		if( 'onclick' in col ){
			icon = '';
			if( col.icon === true ){ 
				icon = '<i class="ff-icon"></i>';
			}
			cellHtml = (['<a href="#">',icon, cellHtml,'</a>']).join('');
			newCell.innerHTML = cellHtml;
			cellLink = newCell.getElementsByTagName('a')[0];
			cellLink.addEventListener( 'click', col['onclick'], false );
		}
		else{
			newCell.innerHTML = cellHtml;
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
			rowUp = rowUp.previousSibling;
			if( rowUp !== null ){
				rowsUp.push( rowUp );
				if( rowUp.className.indexOf( 'ff-selected' ) >=0 ){
					foundRow = true;				
				}
			}

			// get next row down
			rowDown = rowDown.nextSibling;
			if( rowDown !== null ){
				rowsDown.push( rowDown );
				if( rowDown.className.indexOf( 'ff-selected' ) >= 0 ){
					foundRow = true;
					travelUp = false;
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

	var _parentRow = function( el ){
		// return parent <tr> element of element el, or false
		var row = false;

		if( el.tagName == 'TD' ){
			row = el.parentNode;
		}
		else if( el.tagName == 'DIV' && el.className.indexOf('ff-checkbox') >=0 ){
			row = el.parentNode.parentNode;
		}	

		return row;
	}

	var _rowOnClick = function( e ){
		// callback to clicking on a row element (<tr>)

		var el = e.target;				// clicked element
		var selectRow = true;			// whether to select or deselect the row
		var row = _parentRow( el );		// clicked row (parent in DOM of el)
		var cls;						// class string of row (<tr>), looking for ff-selected class

		if( row == false ){ return }		

		cls = row.className;

		if( cls.indexOf( 'ff-selected' ) >= 0 ){
			selectRow = false;
		}

		_toggleRow( row, selectRow );

		// handle shift-key selections
		if( selectRow && e.shiftKey ){ _selectAll( row ); }		
	}

	var _toggleRow = function( row, selectRow ){
		// add or remove "ff-selected" class to <tr> "row"

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

		_toggleCheckbox( checkbox, selectRow )
	}

	var _drawBreadcrumbs = function(){
		// draw breadcrumbs in nav bar
		// called on every folder change

		var _breadcrumbs = that._breadcrumbs;
		var _containerDiv = that._containerDiv;
		var navBar = _containerDiv.getElementsByClassName('js-ff-nav-bar')[0];		

		navBar.innerHTML = '';

		for( var i=0; i < _breadcrumbs.length; i++ ){
			var crumb = _breadcrumbs[i],
				crumbWrapper = document.createElement('span'),
				crumbLink = document.createElement('a'),
				crumbText = crumb[ 'name' ].substring(0,9);

			if( crumbText.length = 10 ){ crumbText += '...'; }

			crumbLink.setAttribute('href','#')
			crumbLink.setAttribute('data-id',crumb['id']);
			crumbLink.innerHTML = crumb[ 'name' ];
			crumbLink.addEventListener( 'click', _changeFolder, false );
			crumbWrapper.appendChild( crumbLink );

			console.log( 'appending child', crumbWrapper, crumbLink, crumb );
			navBar.appendChild( crumbWrapper );
		}
	}

	var _appendRow = function( node, tableEl, _cols ){
		// insert a row node <tr> into table element table_el
		var newRow = tableEl.insertRow(-1);	// new row <tr> element
		var checkboxCell;					// cell <tr> element containing checkbox

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
			row = _parentRow( el );

		_toggleRow( row, true );

		that._contextMenu( e, row, that._containerDiv );
	}

	/* ---------------------- */
	/* --- PUBLIC MEMBERS --- */
	/* ---------------------- */

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
		tableEl.innerHTML = '';

		// add new rows for folder
		for( var i = 0; i < newData.length; i++ ){
			node = newData[i];
			_appendRow( node, tableEl, _cols );
		}

		// update breadcrumb
		that._breadcrumbs.push( { name: folderObj.folderName, id: folderObj.folderId } );
		_drawBreadcrumbs();

		// add folder data to folder cache
		that._data[ folderObj.folderId ] = newData;
	}

	this.retrieveFolder = function( fid, ffObj ){
		// retrieve a folder if its been cached
		// otherwise, return false
		if( fid in ffObj._data ){
			return ffObj._data[ fid ];
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
		for( var j=0; j < this._data[currentFolderId]; j++ ){
			if( this._data[currentFolderId][j].id == fid ){
				this._data[currentFolderId][j][key] = txt;
			}
		}
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

	_createFileTable();
}
