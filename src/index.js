// @ts-check
(function () {
	function oninput(ev) {
		var input = ev.target;
		var val = (input.value || '').trim();
		input.parentNode.classList.toggle('fill', val.length > 0);
	}

	/**
	 *
	 * @param {HTMLInputElement} label
	 * @param {string|false} error
	 */
	function setError(label, error) {
		label.classList.toggle('error', !!error);
		var help = label.querySelector('small');
		if (!help && error) label.appendChild(
			help = document.createElement('small')
		);
		if (help && help._prev && !error) {
			help.textContent = help._prev;
		} else if (error) {
			help._prev = help._prev || help.textContent;
			help.textContent = error;
		} else if (help) {
			help.remove();
		}
	}

	function onload() {
		var $ = document.querySelector.bind(document);
		var i=0, tmp, inputs = document.querySelectorAll('label>input');

		for (; i < inputs.length; i++) {
			tmp = inputs[i];
			if (!/^(radio|checkbox)$/.test(tmp.type)) {
				tmp.oninput = oninput;
			}
		}

		$('form').onsubmit = async function (ev) {
			ev.preventDefault();

			var form = ev.target;
			var res = await fetch(form.action, {
				method: form.method || 'POST',
				body: new FormData(form),
			});

			if (res.ok) {
				form.reset();
				for (i=0; i < inputs.length; i++) {
					setError(inputs[i].parentNode, false);
				}
				let html = await res.text();
				document.documentElement.innerHTML = html;
			} else {
				var text = await res.text();

				try {
					var k, tmp, errors=JSON.parse(text);
					for (k in errors) {
						tmp = form.elements[k];
						setError(tmp.parentNode, errors[k]);
					}
				} catch (e) {
					// was not json
					// TODO: toast box?
					console.log('FAIL', text);
				}
			}
		}
	}

	if (document.readyState !== 'loading') onload();
	else addEventListener('DOMContentLoaded', onload);
})();
