(function () {
	function oninput(ev) {
		var input = ev.target;
		var val = (input.value || '').trim();
		input.parentNode.classList.toggle('fill', val.length>0);
	}

	function onload() {
		var i=0, inputs = document.querySelectorAll('label>input');

		for (; i < inputs.length; i++) {
			inputs[i].oninput = oninput;
		}
	}

	if (document.readyState !== 'loading') onload();
	else addEventListener('DOMContentLoaded', onload);
})();
