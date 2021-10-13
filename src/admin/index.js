// @ts-check
(function () {
	/** @param {number} secs */
	var toDate = secs => new Date(secs * 1e3);

	/** @param {string} x */
	var toLink = x => `<a href="${x}" target="_blank">${x}</a>`;

	// NOTE :: injected via utils.render
	var COUNT = parseInt('{{ count }}', 10);
	var STATES = ['SIGNUP', 'SUBMIT', 'WINNER'];
	var EMPTY = '<td class="na"> – </td>';

	var isCSV = /[&?]csv/i.test(location.search);
	var ITEMS, FETCHER = gather(); // get the data

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
	 * @param {string[]} keys
	 */
	async function toChunk(keys) {
		let res = await fetch('/admin/chunk', {
			method: 'POST',
			body: JSON.stringify(keys),
		});

		if (res.ok) return res.json();
		await res.text().then(txt => {
			console.error('[ERROR]', txt);
		});
	}

	async function gather() {
		let list = await fetch('/admin/list');
		let keys = await list.json();

		let output = [];
		let group, tasks=[];

		while (keys.length > 0) {
			group = keys.splice(0, 100);
			tasks.push(
				toChunk(group).then(items => {
					output.push(...items);
				})
			);
		}

		await Promise.all(tasks);

		let query = new URLSearchParams(location.search);

		let type = query.get('type');
		let isWinner = type === 'winner';
		let isSubmit = type === 'submit';
		let isIdle = type === 'idle';

		let i=0, tmp, items = [];
		for (; i < output.length; i++) {
			tmp = output[i];
			if (!tmp) continue;
			if (isIdle && tmp.submit_at == null) {
				items.push(tmp);
			} else if (isSubmit && tmp.submit_at != null && !tmp.winner) {
				items.push(tmp);
			} else if (isWinner && tmp.winner) {
				// first few winners didnt have this
				tmp.award_at = tmp.award_at || 0;
				items.push(tmp);
			} else if (!type) {
				items.push(tmp);
			}
		}

		if (isWinner) {
			// sort by `award_at` timestamp
			// ~> showing the oldest winners first
			items.sort((a, b) => a.award_at - b.award_at);
		} else {
			// sort by `created_at` timestamp
			// ~> showing the oldest registrants first
			items.sort((a, b) => a.created_at - b.created_at);
		}

		return items;
	}

	async function onload() {
		var root = document.documentElement;

		if (isCSV) {
			root.innerText = 'Loading...';
		}

		ITEMS = await FETCHER;

		if (isCSV) {
			let i=0, tmp, text='';
			for (; i < ITEMS.length; i++) {
				tmp = ITEMS[i];
				text += JSON.stringify(tmp.firstname + ' ' + tmp.lastname);
				text += ',' + JSON.stringify(tmp.email) + '\n';
			}
			return root.innerText = text;
		}

		var $ = document.querySelector.bind(document);
		var $sorts = document.querySelectorAll('th[sort]');
		var tmp, $count = $('footer > b');
		var i=0, $tbody=$('tbody');

		toCount();

		// Normalize data for display
		for (i=0; i < ITEMS.length; i++) {
			tmp = ITEMS[i];
			tmp.seq = i + 1;
			tmp.winner = !!tmp.winner;
			tmp.state = tmp.winner ? 2 : tmp.submit_at ? 1 : 0;
			tmp.created_at = toDate(tmp.created_at);
			if (tmp.submit_at) {
				tmp.submit_at = toDate(tmp.submit_at);
			}
		}

		function toCount() {
			$count.textContent = COUNT;
		}

		function onsort(ev) {
			var elem = ev.target;
			var attr = elem.getAttribute('sort');

			// 0=none, 1=asc, 2=desc
			elem.$sort = (elem.$sort | 0) + 1;
			if (elem.$sort > 2) elem.$sort = 0; // reset

			if (elem.$sort == 0) {
				elem = $sorts[0];
				elem.$sort = 1;
				attr = 'num';
			}

			elem.$sort === 1
				? ITEMS.sort((a, b) => a[attr] == null ? -1 : a[attr] - b[attr]) // ASC
				: ITEMS.sort((a, b) => b[attr] == null ? -1 : b[attr] - a[attr]); // DESC

			// reset others
			for (i=0; i < $sorts.length; i++) {
				if ($sorts[i] !== elem) $sorts[i].$sort = 0;
				$sorts[i].className = '';
			}

			elem.className = elem.$sort === 1 ? 'asc' : 'desc';
			render(); // redraw
		}

		async function onbutton(ev) {
			var elem = ev.target;
			if (elem.nodeName !== 'BUTTON') return;

			if (COUNT < 1) return toast('ERROR', 'No more prizes!');

			var tr = elem.closest('tr');
			if (!tr) return toast('ERROR', 'Cannot locate <tr> element');

			var index = tr.index;
			if (index == null) return toast('ERROR', 'Missing `index` property');

			var data = ITEMS[index];
			if (!data) return toast('ERROR', 'Invalid `index` value');

			elem.disabled = true;
			let res = await fetch('/admin/award', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					uid: data.uid,
					email: data.email,
					count: COUNT - 1,
				})
			});

			if (res.ok) {
				data.state = 2;
				var cell = tr.children[4];
				cell.textContent = STATES[2];
				COUNT--; toCount();
			} else {
				var text = await res.text();

				try {
					var obj = JSON.parse(text) || {};
					return toast(
						'Error ' + (obj.status || 500),
						obj.reason || 'An unknown error occurred!'
					);
				} catch (e) {
					// was not json
					return toast('Error ' + res.status, text);
				}
			}
		}

		function render() {
			// hack; delete all content
			$tbody.textContent = '';

			var data, tr, cells='';
			for (i=0; i < ITEMS.length; i++) {
				cells = '';
				data = ITEMS[i];
				tr = document.createElement('tr');
				tr.index = i;

				cells += `<td>${data.seq}</td>`;
				cells += `<td>${data.firstname}</td>`;
				cells += `<td>${data.lastname}</td>`;
				cells += `<td>${data.email}</td>`;

				cells += `<td>${STATES[data.state]}</td>`;
				cells += `<td>${data.created_at.toLocaleDateString()}</td>`;

				if (data.submit_at) {
					cells += `<td>${data.submit_at.toLocaleDateString()}</td>`;
					cells += `<td>${toLink(data.projecturl)}</td>`;
					cells += `<td>${toLink(data.demourl)}</td>`;
					cells += data.cftv ? '<td>✅</td>' : '<td>⛔️</td>';
					cells += data.ccsa ? '<td>✅</td>' : '<td>⛔️</td>';
					cells += data.winner ? EMPTY : '<td><button class="btn pri">AWARD</button></td>';
				} else {
					cells += EMPTY; // submit_at
					cells += EMPTY; // project url
					cells += EMPTY; // live demo
					cells += EMPTY; // cftv
					cells += EMPTY; // ccsa
					cells += EMPTY; // BUTTON
				}

				tr.innerHTML = cells;
				$tbody.appendChild(tr);
			}
		}

		// draw
		render();

		// initialize listeners
		for (i=0; i < $sorts.length; i++) {
			$sorts[i].onclick = onsort;
		}

		$tbody.addEventListener('click', onbutton);
	}

	if (document.readyState !== 'loading') onload();
	else addEventListener('DOMContentLoaded', onload);
})();
