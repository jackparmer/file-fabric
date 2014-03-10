FileFabric
==========

Lightweight, Google Docs-like file list viewer. 

## Demo

Check out https://plot.ly/plot. You'll have to create an account and save some Plotly files.

![FileFabric preview](http://i.imgur.com/jfhR1mD.png)

## Getting Started

Include filefabric.js and filefabric.css. Then create a new file tree like so:

### ```fileViewer = new FileFabric( configObject )```

__configObject__ defines the columns and rows of the file. Here's an example:

```javascript
var configObject = {
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
```

Possible keys for the configuration object are:

* __fileJson__ JSON array of row objects. More on this later.
* __containerDiv__ DIV container for file list
* __columns__ Array of column objects. Possible column object keys:
    * __name__ Name of file list column
    * __key__ Key in fileJson that matches column to row data
    * __template__ (optional) Template function for column cells \*\*
    * __onclick__ (optional) Function - click event listener for cell text
    * __cellClasses__ (optional) String - class names string to add to all cells in column
* __contextMenu__ (optional) Function - contextMenu (right-click) event listener
* __changeFilder__ (optional) Function - called after folder changes

\*\* Template functions are passed a row object from the fileJSON array and return the HTML for that cell.

## Row Data

Row data (the list of files) is encoded in the fileJson array.  <br />
This will likely be returned by an AJAX call to a server.  <br />
Each row gets on object. For example,

```javascript
var fileJson = JSON.stringify([
       {
            attr: { id: 'row1', rel: 'folder' }
            data: 'Row 1 Filename',
            imgurl: 'http://imgur.com/111',
            sharing: 'Private',
            shortlink: 'https://bit.ly/111',
            created: 'August 1'
       },
       {
            attr: { id: 'row2', rel: 'spreadsheet' }
            data: 'Row 2 Filename',
            imgurl: 'http://imgur.com/222',
            sharing: 'Shared',
            shortlink: 'https://bit.ly/222',
            created: 'January 3'       
       }
]);
```

This would create a file viewer with 2 files - 1 for each row. __attr__ is an object HTML attributes to add to the row. The other top level keys correspond to the __key__ fields in the columns object (see above).
All file items must have a unique __id__ key in the __attr__ object, everything else is optional.

## Public Methods

FileFabric objects (*"fileViewer"* from the example above) have a number of public methods:

### ```fileViewer.parentRow( el )``` 
Returns the the top-level HTML row element given an HTML element inside the row.

### ```fileViewer.showFolder( folderObject )``` 
Swipes the file viewer to show contents of a new folder. Accpeted keys for folderObj are

* __fileJson__		JSON string of files in folder
* __folderId__		Unique id of folder
* __folderName__    Name of folder

### ```fileViewer.retrieveFolder( fid )```
Given a folder id, return the file objects for that folder if the folder has been loaded via showFolder().  <br />
If a folder with that id does not exist, return false. <br />
This allows for "lazy-loading" - not loading folder contents from the server until a user opens that folder.

### ```fileViewer.renameCell( fid, key text )```
Reset the text contents of a cell

* __fid__   file id of item (row)
* __key__   column id of item
* __txt__   new name for cell

### ```fileViewer.getCheckedItems()```
Return all checked file items as an array of DOM elements

### ```fileViewer.moveCheckedItems( parentId )```
Given a folder id (__parentId__), move all checked file items into that folder.

### ```fileViewer.removeCheckedItems()```
Remove all checked items

### ```fileViewer.addItems( fileJson, position )```
Add rows to the root of the file tree
* __fileJson__ unparsed JSON, array of file objects
* __position__ optional, 'first' to preprend items at beginning of folder

### ```fileViewer.setItemAttributes( id, attributes )```
Set HTML attributes fo a row with id __id__
__attributes__ is an object of key-value pairs

### ```fileViewer.redrawOne( newNode )```
Redraw a table row given a new node

### ```fileViewer.createOrUpdateOne(  node, position )```
Given a single node object, create it if it does not exist; update it if it does
Only updates the node attrributes, not the row cells. use redrawOne() to redraw cells
* __node__        a single row object
* __position__    where to append node in tree if creating it, either "first" or "last"

### ```fileViewer.getItemsByAttribute(  key, val )```
Return all loaded rows with attribute 'key' having value 'val'.  <br />
For example, fileViewer.getItemsByAttribute( 'class', 'hello' )  <br />
returns all rows having class 'hello'

### ```fileViewer.getCurrentFolder()```
Returns the id and name of the current folder in view in an object with keys __id__ and __name__  <br />
The root folder has a reserved id, which is "ff-root"

### ```fileViewer.toggleCheckboxes()```
Click event listener for a "select all" checkbox  <br /> 
Behavior:  <br /> 
No rows are selected --> select all rows  <br /> 
All rows are selected --> deselect all rows  <br /> 
Some rows are selected --> deselect all rows  <br /> 

### ```fileViewer.selectAllItems( state )```
Select or deselect all rows  <br /> 
Set __state__ to true to select all rows; false to deselect rows, defaults to true
