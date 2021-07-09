// @ts-check
(function () {
	function oninput(ev) {
		var input = ev.target;
		var val = (input.value || '').trim();
		input.parentNode.classList.toggle('fill', val.length > 0);
	}

	var toaster;
	function toast(title, text) {
		if (!toaster) {
			toaster = document.createElement('div');
			document.body.appendChild(toaster);
			toaster.className = 'toaster';
		}
		// super basic, just show a message
		var toast = document.createElement('div');
		toast.innerHTML = `<strong>${title}</strong>`;
		toast.innerHTML += `<small>${text}</small>`;
		toaster.appendChild(toast);

		setTimeout(() => toast.className = 'show', 250);
		setTimeout(() => toaster.removeChild(toast), 10e3);
	}

	/**
	 * @param {HTMLElement} label
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
		/** @type {NodeListOf<HTMLInputElement>} */
		var inputs = document.querySelectorAll('label>input');
		var i=0, tmp, $ = document.querySelector.bind(document);

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

			// always reset any errors
			for (i=0; i < inputs.length; i++) {
				setError(inputs[i].parentNode, false);
			}

			if (res.ok) {
				form.reset();
				let html = await res.text();
				document.documentElement.innerHTML = html;
			} else {
				var title='', text = await res.text();

				try {
					var obj = JSON.parse(text) || {};
				} catch (e) {
					// was not json
					return toast('Error ' + res.status, text);
				}

				if (res.status === 422) {
					title = 'Validation Errors';
					text = 'Please correct the invalid form field(s) and resubmit.'
					for (var k in obj) {
						var tmp = form.elements[k];
						setError(tmp.parentNode, obj[k]);
					}
				} else {
					title = 'Error ' + (obj.status || 500);
					text = obj.reason || 'An unknown error occurred!';
				}

				toast(title, text);
			}
		}
	}

	if (document.readyState !== 'loading') onload();
	else addEventListener('DOMContentLoaded', onload);
})();
