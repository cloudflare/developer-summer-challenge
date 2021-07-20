/**
 * @POST https://api.sparkpost.com/api/v1/templates -H "Authorization:<<TOKEN>>"
 * @see https://developers.sparkpost.com/api/templates/#templates-post-create-a-template
 */

const options = {
	transactional: true,
	click_tracking: false,
	open_tracking: false
}

const from = {
	name: 'Cloudflare',
	email: 'noreply@notify.cloudflare.com'
};

// vars: firstname, code
const CONFIRM = JSON.stringify({
	id: 'devchallenge-confirm',
	name: 'Dev Challenge: Confirm',
	description: 'initial confirmation email for challenge participants',
	options,
	content: {
		subject: '[Cloudflare]: Summer Challenge Registration',
		html: `<p>Thank you for signing up for the Cloudflare Summer Challenge, {{firstname}}!</p><p><b>Challenge Recap</b></p><p>You're challenged to build <em>any application</em> so long as it utilizes at least two of Cloudflare's developer platform products: Workers, Workers KV, Durable Objects, and/or Pages. <b>Submissions are already open</b> and are judged on a rolling basis. Winners will be awarded a <b>swag box</b> and the challenge continues while supplies last.</p><p>Visit the <a href="https://challenge.developers.cloudflare.com/#info">FAQ</a> for the brief, rules, and any additional information.</p><p><b>How to Submit:</b></p><p>Every participant has a personalized submission link – <a href="https://challenge.developers.cloudflare.com/submit?code={{code}}">here is yours!</a> You must a link to a live demo and a link to the source code.</p><p>Good luck and have fun!</p>`,
		from,
	}
});

// vars: firstname, projecturl, demourl
const SUBMIT = JSON.stringify({
	id: 'devchallenge-submit',
	name: 'Dev Challenge: Submit',
	description: 'acknowledge we received project submission',
	options,
	content: {
		subject: '[Cloudflare]: Summer Challenge Received!',
		html: `<p>Wow, {{firstname}}! <b>You did it!</b></p><p>Thank you for taking the time to finish and submit your entry for the Summer Challenge. Our records show that you sent us:</p><ul><li>Source Code – {{projecturl}}</li><li>Live Demo – {{demourl}}</li></ul><p><b>NOTE:</b> Please verify that both links are working and publicly-accessible.</p><p>We will review your submission ASAP.</p><p>Projects are judged on a rolling basis. If you win a <b>swag box</b>, we will notify you directly via email in order to proceed with shipping information.</p><p>Good luck!</p>`,
		from,
	}
});

// vars: firstname, code
const WINNER = JSON.stringify({
	id: 'devchallenge-winner',
	name: 'Dev Challenge: Winner',
	description: 'notify the participant that they won',
	options,
	content: {
		subject: '[Cloudflare]: Summer Challenge Winner!',
		html: `<p><b>Congratulations, {{firstname}}! You won a swag box!</p><p>We received so many great Summer Challenge submissions. It's clear that we have a creative (and competitive) community. However, your project stands out and qualifies as a Challenge winner. We hope you're as happy as we are!</p><p>We will be in touch with you again shortly to collecting sizing and shipping information.</p><p>Thank you!</p>`,
		from,
	}
});
