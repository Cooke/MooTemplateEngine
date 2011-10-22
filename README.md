Moo Template Engine
===========

The Moo Template Engine (MTE) provides the means to easily create HTML templates from JavaScript and HTML. 
The templates let you render DOM elements which can be inserted in to the DOM tree.

The rendered elements may be customized (data bound) by supplying rendering data (a data source) upon rendering.
If the data source is observable the rendered elements will observe the data source and re-render themselves whenever 
the data source is modified.

How to use
----------

This section gives a super short introduction to the library with help of a few examples (not covering all features). For more demos, documentation and information 
please visit [http://mte.null-tech.com](http://mte.null-tech.com)

A simple HTML template:

	<div id="template">
		<h1 data-bind="name"></h1>
		<p>You are <span data-bind="age"></span> years old!
		<a data-bind-href="homepage" data-bind="homepage"></a>
	</div>

	<script type="text/javascript">
		var engine = new MTEEngine.Markup();
		var template = engine.fromElement('template');

		$('page').adopt(template.render({name: 'My Name', age: 99, homepage: 'http://www.mypage.com'}));
	</script>
	
A HTML template which renders an array:

	<ul id="template" data-list="numbers">
		<li data-bind=".">			
		</li>
	</ul>

	var engine = new MTEEngine.Markup();
	var template = engine.fromElement('template');

	$('page').adopt(template.render({numbers: ['One', 'Two', 'Three']));
	
Another template created in JS:

	var engine = new MTEEngine();
	var template = null;
	
	with(engine) {
		template = 
			div('Hello ', bind('name'), br(),
				'You have the following pets: ',
				div(context('pets'), {styles: {marginLeft: '10px'}}, bind())
			);                      
	};
	
	var data = {            
		name: 'Henrik',
		pets: ['Dog', 'Hourse', 'Super Beaver']
	};
	
	$('page').adopt(template.render(data));
	
Using templates created with HTML in a separate file which is loaded asynchronously:
	
	var engine = new MTEEngine.Markup();
	
	// Loading templates from external file
	engine.load('templates.html', {}, function(templates) {		
		$('page').adopt(templates.templateA.render(dataForTemplateA));
		$('page').adopt(templates.templateB.render(dataForTemplateB));
	});	
	
More information
-----------------
For more information please visit [http://mte.null-tech.com](http://mte.null-tech.com)
