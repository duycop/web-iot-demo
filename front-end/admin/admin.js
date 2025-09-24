$(document).ready(function () {
	/*--Cookie---------------------------------------*/
	function setCookie(name, value, days) {
		let expires = "";
		if (days) {
			let date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = name + "=" + (value || "") + expires + "; path=/";
	}
	function getCookie(name) {
		let nameEQ = name + "=";
		let ca = document.cookie.split(';');
		for (let i = 0; i < ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
		}
		return null;
	}
	function eraseCookie(name) {
		document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	}
	function getLocal(name) {
		return window.localStorage.getItem(name);
	}
	function setLocal(name, value) {
		window.localStorage.setItem(name, value);
	}
	function delLocal(name) {
		localStorage.removeItem(name);
	}
	function get_store(key) {
		let value = getCookie(key);
		if (value == null || value == '' || value === undefined) {
			value = getLocal(key);
		}
		if (value === undefined) value = ''
		return value;
	}
	/***********************/
	var user_info=null;
	function check_login() {
		let ck = get_store('ck');
		let uid = get_store('uid');
		if (ck != null && uid != null) {
			$.post('/api/check',
				{
					ck: ck,
					uid: uid,
				},
					function (json) {
					logined = json.ok;
					if (logined) {
						user_info = json;
						console.log('logined');
						login_ok();
					}else{
						console.log('not login.');
						not_login();
					}
				});
		} else {
			console.log('not login');
			not_login();
		}
	}
	function showError(text){ msg.className='error'; msg.textContent = text }
	function showHint(text){ msg.className='hint'; msg.textContent = text }
	/***********************/
	function not_login(){
		showError('You not logined');
		const form = document.getElementById('changeForm');
		var stt=0;
		form.addEventListener('submit', (e)=>{
			e.preventDefault();
			stt++;
			showError('Bạn chưa đăng nhập. Bạn không thể đổi mật khẩu. Bạn đã thử '+stt+' lần');
		});
	}
	function login_ok(){
		showHint('Bạn đã đăng nhập với username: '+user_info.uid);
		const form = document.getElementById('changeForm');
		const oldPwd = document.getElementById('oldPwd');
		const newPwd = document.getElementById('newPwd');
		const confirmPwd = document.getElementById('confirmPwd');
		const msg = document.getElementById('msg');
		const toggle = document.getElementById('toggle');
		toggle.addEventListener('click', ()=>{
			const t = (i)=> i.type === 'password' ? 'text' : 'password';
			oldPwd.type = t(oldPwd);
			newPwd.type = t(newPwd);
			confirmPwd.type = t(confirmPwd);
		});
		form.addEventListener('submit', (e)=>{
			e.preventDefault();
			msg.textContent = '';

			// Basic client-side checks
			if(!oldPwd.value) return showError('Nhập mật khẩu cũ.');
			if(newPwd.value.length < 6) return showError('Mật khẩu mới phải ít nhất 6 ký tự.');
			if(newPwd.value !== confirmPwd.value) return showError('Mật khẩu mới và xác nhận không trùng.');
			if(newPwd.value === oldPwd.value) return showError('Mật khẩu mới phải khác mật khẩu cũ.');

			showHint('Đang gửi...');
			$.post('/api/changepw',
				{
					uid: user_info.uid,
					pwd: oldPwd.value,
					newpw: newPwd.value
				},
				function (json) {
					showHint(json.msg);
				}
			);
		});
	}
	/***********************/
	check_login();
});