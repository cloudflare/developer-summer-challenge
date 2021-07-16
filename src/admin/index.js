// @ts-check
(function () {
	var EMPTY = '<td class="na"> – </td>';
	var STATES = ['SIGNUP', 'SUBMIT', 'WINNER'];

	/** @param {Date} x */
	var toDate = x => x.toLocaleDateString();

	/** @param {string} x */
	var toLink = x => `<a href="${x}" target="_blank">${x}</a>`;

	var rand = () => Math.random() > 0.5;

	var COUNT = parseInt('300+', 10);
	// var COUNT = parseInt('{{ COUNT }}', 10);
	// var ENTRIES = JSON.parse('{{ DATA }}');
	var ENTRIES = Array.from({ length: 100 }, (n, i) => {
		let state = rand() ? (rand() ? 2 : 1) : 0;
		let isSubmit = state > 0;
		return {
			num: i,
			status: state,
			email: `foo${i}@asd.com`,
			firstname: `Foo ${i}`,
			lastname: `Bar ${i}`,
			code: 'asdbas',
			created_at: new Date,
			submit_at: isSubmit ? new Date : null,
			projecturl: isSubmit ? 'https://github.com' : null,
			demourl: isSubmit ? 'https://asd.com' : null,
			cftv: isSubmit ? +rand() : null,
			// row?: string,
		}
	});

	function onload() {
		var $ = document.querySelector.bind(document);
		var $sorts = document.querySelectorAll('th[sort]');
		var $count = $('footer > b');
		var i=0, $tbody=$('tbody');

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
				? ENTRIES.sort((a, b) => a[attr] == null ? -1 : a[attr] - b[attr]) // ASC
				: ENTRIES.sort((a, b) => b[attr] == null ? -1 : b[attr] - a[attr]); // DESC

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

			if (COUNT < 1) return console.error('no more prizes');

			var tr = elem.closest('tr');
			if (!tr) return console.error('could not find <tr>');

			var index = tr.index;
			if (index == null) return console.error('missing `index` property');

			var data = ENTRIES[index];
			if (!data) return console.error('invalid `index` value');

			elem.disabled = true;
			let res = await fetch('/admin/award', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					uid: data.uid, // TODO
					email: data.email,
				})
			});

			if (res.ok) {
				data.status = 2;
				var cell = tr.children[4];
				cell.textContent = STATES[2];
				COUNT--; toCount();
			} else {
				console.error('ERROR AWARDING USER');
			}
		}

		function render() {
			// hack; delete all content
			$tbody.textContent = '';

			var data, tr, cells='';
			for (i=0; i < ENTRIES.length; i++) {
				cells = '';
				data = ENTRIES[i];
				tr = document.createElement('tr');
				tr.index = i;

				cells += `<td>${data.num}</td>`;
				cells += `<td>${data.firstname}</td>`;
				cells += `<td>${data.lastname}</td>`;
				cells += `<td>${data.email}</td>`;

				cells += `<td>${STATES[data.status]}</td>`;
				cells += `<td>${toDate(data.created_at)}</td>`;

				if (data.submit_at) {
					cells += `<td>${toDate(data.submit_at)}</td>`;
					cells += `<td>${toLink(data.projecturl)}</td>`;
					cells += `<td>${toLink(data.demourl)}</td>`;
					cells += data.cftv ? '<td>✅</td>' : '<td>⛔️</td>';
					// is winner
					if (data.status === 2) {
						cells += EMPTY; // BUTTON
						cells += '<td></td>'; // Address
						cells += '<td></td>'; // Country
					} else {
						cells += '<td><button class="btn pri">AWARD</button></td>'; // BUTTON
						cells += EMPTY; // Address
						cells += EMPTY; // Country
					}
				} else {
					cells += EMPTY; // submit_at
					cells += EMPTY; // project url
					cells += EMPTY; // live demo
					cells += EMPTY; // cftv
					cells += EMPTY; // BUTTON
					cells += EMPTY; // Address
					cells += EMPTY; // Country
				}

				tr.innerHTML = cells;
				$tbody.appendChild(tr);
			}
		}

		// draw
		toCount();
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
