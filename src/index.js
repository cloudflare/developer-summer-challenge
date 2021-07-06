(function () {
	function oninput(ev) {
		var input = ev.target;
		var val = (input.value || '').trim();
		input.parentNode.classList.toggle('fill', val.length > 0);
	}

	function onload() {
		var $ = document.querySelector.bind(document);
		var i=0, inputs = document.querySelectorAll('label>input');

		for (; i < inputs.length; i++) {
			inputs[i].oninput = oninput;
		}

		$('.signup form').onsubmit = async function (ev) {
			ev.preventDefault();

			var form = ev.target;
			var res = await fetch(form.action, {
				method: form.method || 'POST',
				body: new FormData(form),
			});

			if (res.ok) {
				form.reset();
				// TODO: success screen
				console.log('OK');
				for (i=0; i < inputs.length; i++) {
					input[i].parentNode.className = '';
				}
			} else {
				try {
					var error = await res.json();
				} catch (e) {
					// was not json
				}

				// TODO: toast box?
				console.log('FAIL', error);
			}
		}
	}

	if (document.readyState !== 'loading') onload();
	else addEventListener('DOMContentLoaded', onload);
})();
