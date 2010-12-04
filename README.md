Moo Template Engine
===========

A template library to create powerful HTML-templates from JavaScript. The templates can be created with help of
binding expression which binds the generated elements to specific data when the templates are rendered.

How to use
----------

This section gives a very short introduction to the library, with a simple example. For more information please
visit [http://mte.null-tech.com](http://mte.null-tech.com)

The template engine is used by calling the tag method, or any of its "shortcut methods" (div, span, ...), which generates a template for
a specific tag. The templates can be nested and may specify bindings with help of the bind method. The bindings are 
evaluated during rendering to bind data objects to the rendered elements. Each tag can be contain an arbitrary 
number of sub templates. 

A context may be set on a template by using a context expression created with help of the context method. It allows the 
template to bind towards "sub" properties in the original data source. 

Also element properties may be passed, just as for the constructor of an Element, which in turn may contain binding expressions.

Example:

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

More information
-----------------
For more information please visit http://mte.null-tech.com
