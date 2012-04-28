0.4 (2012-04-28)
-----------------

  * List binding
    * Added support for binding against ObservableObject.
	* Added support for sorting via an additional parameter. 
	
  * Display binding
    * Added support for formatting.
	
  * ObservableObject
    * Removed awkward key/property name lowerization.
	* Removed update notification (triggerChange) on parent object when recursively updating child objects.
	* Added remove method which can be used to remove properties of an object (triggers update notification with value undefined).
		
  * Removed ObservableMap, ObservableArray and MTEObservableAutoProperties (ObservableObject should be used instead).