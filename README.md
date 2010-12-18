Moo Template Engine
===========

The Moo Template Engine (MTE) provides the means to easily create HTML templates from JavaScript or "HTML" markup. 
The templates let you render DOM elements which can be inserted in to the DOM tree.

The rendered elements may be customized (data bound) by supplying rendering data (a data source) upon rendering.
If the data source is observable the rendered elements will observe the data source and re-render themselves whenever 
the data source is modified.

How to use
----------

This section gives a short introduction to the library with help of examples. For more demos, documentation and information 
please visit [http://mte.null-tech.com](http://mte.null-tech.com)

A simple template without a data source:

	var engine = new MTEEngine();
	var template = null;

	with(engine) {
		template = 
			div({class: 'myClass'},
				h1('My Title'),
				p('This is my content'),
				p('Webpage: ', a({href: 'http://www.google.com'}, 'google.com')));

		element = template();
		$('page').adopt(element);					
	};

	$('page').adopt(template());
	
A template with a simple data source:

	var engine = new MTEEngine();
	var template = null;

	with(engine) {
		template = 
			div({id: 'myId'}, 
				strong('Hello '), bind('myProperty'), '!');						
	};

	$('page').adopt(template({myProperty: 'MyValue'}));
	
A template rendered with an array data source:

	var engine = new MTEEngine();
	var template = null;

	with(engine) {
		template = 
			div(bind(), br());						
	};

	$('page').adopt(template(['One', 'Two', 'Three']));
	
A more complex example:

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
	
	$('page').adopt(template(data));
	
Templates created with "HTML" markup:
	<script type="text/mte" id="templates">
		<div id="template1">
			Hello <bind property="name" />!<br />
			You are <strong bind="age"></strong> years old!
		</div>

		<div id="template2">
			This is <em>template2</em>!
		</div>
	</script>
	
Using markup templates:
	
	var engine = new MTEEngine.Markup();
	
	// Loading templates from external file
	engine.load('templates.html', {}, function(templates) {		
		$('page').adopt(templates.templateA(dataForTemplateA));
		$('page').adopt(templates.templateB(dataForTemplateB));
	});
	
	// Loading template from internal script node
	var templates = engine.fromMarkup($('templates').get('html'));
	$('page').adopt(templates.template1(dataForTemplate1));
	$('page').adopt(templates.template2(dataForTemplate2));

An example using observable models and collections:
	Visit [http://mte.null-tech.com/demos.html#ex6](http://mte.null-tech.com/demos.html#ex6)	

More information
-----------------
For more information please visit [http://mte.null-tech.com](http://mte.null-tech.com)
