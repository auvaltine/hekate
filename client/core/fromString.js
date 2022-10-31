Hekate.fromString = (elem, context) => {
	if (typeof elem === 'string') {
		context = Hekate.hidden[typeof context === 'string' ? context : 'html'];
		if ((context = context || Hekate.hidden.html)) {
			context.innerHTML = elem.replace(Hekate.regex.doctype, '');
			elem = (context.content ? context.content : context).childNodes;
		}
	} else {
		elem = [ elem ];
	}
	return Array.from(elem).filter(a => a.nodeType && a.nodeType === 1);
};
