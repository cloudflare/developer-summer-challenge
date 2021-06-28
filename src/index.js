(function () {
	function oninput(ev) {
		var input = ev.target;
		var val = (input.value || '').trim();
		input.parentNode.classList.toggle('fill', val.length>0);
	}

	function onload() {
		var $ = document.querySelector.bind(document);
		var i=0, inputs = document.querySelectorAll('label>input');

		$('.signup form').onsubmit = async function (ev) {
			ev.preventDefault();
			var form = ev.target;
			var fdata = new FormData(form);
			var res = await fetch(form.action, {
				method: form.method || 'POST',
				body: fdata,
			});
			if (res.ok) {
				// TODO: success screen
				console.log('OK');
				form.reset();
			} else {
				// TODO: toast box?
				var errors = await res.json();
				console.log('FAIl', errors);
			}
		}

		for (; i < inputs.length; i++) {
			inputs[i].oninput = oninput;
		}
	}

	if (document.readyState !== 'loading') onload();
	else addEventListener('DOMContentLoaded', onload);
})();
