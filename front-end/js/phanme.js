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
	var all_sensor = null, sensor_map={}, all_grafana = null, all_tid={},last_value = {};
    function connectWS() {
        const secure = window.location.protocol === "https:" ? "s" : "";
        const host = window.location.host;
        const wsUrl = `ws${secure}://${host}/ws/`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if ("online" in data) {
                    $("#online-client").html(data.online);
                } else if ("s" in data) {
                	var v=data.v.toFixed(2);
                    $(".sensor-value-" + data.s).html(v);
                    $(".sensor-time-" + data.s).html("00:00");
                    $(".sensor-time-" + data.s).attr("ss",0);
                    sensor_map[data.s].value = data.v;
                    $(`.update-time-${sensor_map[data.s].tid}`).attr('ss', 0);
                    if(data.s%10==3){ //13 23 33 is speed
                    	var tid = parseInt(data.s/10);
                    	var run = true;
                    	if(data.v>0){
                    		if(data.s==23){ 
                    			//riêng cân china thì speed luôn là 1, phải dùng thông số rate
                    			run = (sensor_map[23].value>0) && (sensor_map[21].value > 0);
                    		}else{
                    			run = true; //cân khác thì speed > 0 là RUN
                    		}
                    	}else{
                    		run = false;
                    	}
                    	if(run){
                    		$('.bang-tai-can-'+tid).removeClass('stop').addClass('run');
                    	}else{
                    		$('.bang-tai-can-'+tid).removeClass('run').addClass('stop');
                    	}
                    }
                }
            } catch (err) {
                console.log("Received text: ", event.data);
            }
        };
        ws.onopen = () => {
            ws.send("Hello from browser!");
        }
        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };
        ws.onclose = () => {
            console.warn("WebSocket closed. Reconnecting in 5s...");
            setTimeout(connectWS, 5000);
        };
    }
    function gen_table(data, tid) {
        var html = `<div class="table-responsive-x"><table class="table table-bordered table-striped table-hover">
		    <thead>
		    	<tr class="table-info">
					<th colspan="5" class="text-center align-middle">Cân băng ${(tid*1+1)} - Update <span class="update-time-${tid} time" ss="0">0</span>'s ago</th>
		    	</tr>
		        <tr class="table-info">
		            <th class="text-center align-middle">ID</th>
		            <th class="text-center align-middle">Name</th>
		            <th class="text-end align-middle">Value</th>
		    		<th class="text-center align-middle">Unit</th>
		            <th class="text-end align-middle">Last change</th>
		        </tr>
		    </thead>
		    <tbody>`;
        for (const item of data) {
            if (item.tid == tid) {
                html += `<tr class="sensor-item" data-sid="${item.id}">
		            <td class="text-center align-middle">${item.id}</td>
		            <td class="sensor-name-${item.id} text-begin align-middle">${item.name.replace(' ', '&nbsp;')}</td>
		            <td class="sensor-value-${item.id} text-end align-middle">${item.value}</td>
		        	<td class="sensor-unit-${item.id} text-center align-middle">${item.unit}</td>
		            <td class="text-end align-middle"><span class="sensor-time-${item.id} time" ss="${item.ss}">${ago(item.ss)}</span></td>
		        	</tr>`;
            }
        }
        html += `</tbody>
			<tfoot>
				<tr><th colspan=5 class="text-center"><button class="btn btn-primary cmd-report" data-tid="${tid}"><i class="fa-solid fa-print"></i> Báo cáo Cân băng ${(tid*1+1)}</button></th></tr>
			</tfoot>
        </table></div>`;
        return html;
    }
	function gen_can_layout(data, tid){
		var status='run';
		const rate = sensor_map[tid*10+1].value;
		const load = sensor_map[tid*10+2].value;
		const speed = sensor_map[tid*10+3].value;
		const total = sensor_map[tid*10+4].value;
		if(tid==2){
			status = (speed > 0 && rate > 0)?'run':'stop';
		}
		if(speed==0)status='stop';
    	var html = `<table width="100%" align="center">
		    <body>
		    	<tr>
					<td colspan="2" class="text-center align-middle"><div class="ten-can-bang">CÂN BĂNG SỐ ${(tid*1+1)}</div></td>
		    	</tr>
		    	<tr>
					<td colspan="2" class="text-center align-middle"><div class="update-time">Cập nhật <span class="update-time-${tid} time" ss="0">0</span>'s</div></td>
		    	</tr>
		        <tr>
					<td class="text-center align-middle" width="50%">TỔNG TÍCH LŨY<br>(Tấn)</th><td><div class="tong-tich-luy sensor-value-${tid}4 sensor-item" data-sid="${tid}4">${total}</div></td>
		    	</tr>
		        <tr>
					<td class="text-center align-middle" width="50%">LƯU LƯỢNG CÂN<br>(Tấn/giờ)</td><td><div class="luu-luong-can sensor-value-${tid}1 sensor-item" data-sid="${tid}1">${rate}</div></td>
		        </tr>
		    	<tr>
					<td colspan="2">
						<div class="bang-tai-can ${status} bang-tai-can-${tid}">
							<div class="row speed-load">
								<div class="col-6 text-end"><span class="sensor-item" data-sid="${tid}3"><span class="sensor-value-${tid}3">${speed}</span> m/s</span></div>
								<div class="col-6 text-center"><span class="sensor-item" data-sid="${tid}2"><span class="sensor-value-${tid}2">${load}</span> kg/m</span></div>
							</div>
							<div class="img-bang-tai cmd-report" data-tid="${tid}"></div>
						</div>
					</td>
		    	</tr>
		    </body>
		    <tbody>`;
        html += '</tbody></table></div>';
        return html;
    }
    function show_report(tid){
    	var first_show_dialog=true;
    	var content = `<div class="card-body" style="overflow: hidden">
	      <form id="frm-report" class="row g-3">
	        <div class="col-md-6"><input type="hidden" name="id" value="id${tid}">
	          <label for="t1" class="form-label">Thời gian bắt đầu</label>
	          <input type="datetime-local" class="form-control" id="t1" name="t1" value="${get_t1()}" required>
	        </div>
	        <div class="col-md-6">
	          <label for="t2" class="form-label">Thời gian kết thúc</label>
	          <input type="datetime-local" class="form-control" id="t2" name="t2" value="${get_t2()}" required>
	        </div>
	        <div class="col-12 gap-2 text-center">
	          <button id="btn" type="button" class="btn btn-primary cmd-truy-van"><i class="fa-solid fa-gear"></i> Truy vấn dữ liệu</button>
	        </div>
	      </form>

	      <div id="err" class="alert alert-danger mt-3 d-none"></div>

	      <div id="out" class="row text-center mt-3 ">
	        <div class="col-md-4 mb-2">
	          <div class="card border-info">
	            <div class="card-body">
	              <h6 class="card-subtitle text-muted">Chỉ Số Đầu</h6>
	              <h4 id="report-min" class="card-title loading-value"><div class="spinner-border text-info"></div></h4>
	            </div>
	          </div>
	        </div>
	        <div class="col-md-4 mb-2">
	          <div class="card border-success">
	            <div class="card-body">
	              <h6 class="card-subtitle text-muted">Chỉ Số Cuối</h6>
	              <h4 id="report-max" class="card-title loading-value"><div class="spinner-border text-success"></div></h4>
	            </div>
	          </div>
	        </div>
	        <div class="col-md-4 mb-2">
	          <div class="card border-warning">
	            <div class="card-body">
	              <h6 class="card-subtitle text-muted">Số Cân (Tấn)</h6>
	              <h4 id="report-total" class="card-title loading-value"><div class="spinner-border text-warning"></div></h4>
	            </div>
	          </div>
	        </div>
	      </div>
	    </div><iframe id="printFrame" style="display:none;"></iframe>`;
	    function get_t1(){
	    	const now = new Date();
		    const pad = n => String(n).padStart(2,"0");
		    // T1 = 0h cùng ngày local
		    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		    const t1val = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
		    return t1val;
	    }
	    function get_t2(){
	    	const now = new Date();
		    const pad = n => String(n).padStart(2,"0");
		    // T2 = giờ hiện tại local
		    now.setMinutes(now.getMinutes() + 1);
		    const t2val = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
		    return t2val;
	    }
	    function _getVND(d) {
		    let dd   = String(d.getDate()).padStart(2, '0');
		    let MM   = String(d.getMonth() + 1).padStart(2, '0'); // tháng bắt đầu từ 0
		    let yyyy = d.getFullYear();

		    let HH   = String(d.getHours()).padStart(2, '0');
		    let mm   = String(d.getMinutes()).padStart(2, '0');
		    let ss   = String(d.getSeconds()).padStart(2, '0');

		    return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss}`;
		}
		function getVND(id) {
	    	let val = document.getElementById(id).value; // ví dụ: "2025-09-08T00:00"
	    	let d = new Date(val);
	    	return _getVND(d);
		}
	    function getUTC(id) {
		    let val = document.getElementById(id).value; // ví dụ: "2025-09-08T00:00"
		    if (!val) return;

		    // Chuyển sang Date (trình duyệt hiểu là local time, tức giờ VN)
		    let d = new Date(val);

		    // Xuất ra dạng ISO UTC có hậu tố Z
			let utcStr = d.toISOString().split(".")[0] + "Z";
		    return utcStr;
		}
		function getEpoch(id) {
		    let val = getUTC(id)
		    let d = new Date(val);
		    let epoch = d.getTime();
		    return epoch;
		}
		var data_submit={}
		function thoi_gian_alert(){
			$.alert({title:"Lỗi", content:"Xem lại mốc thời gian", type: 'red',scrollToPreviousElement: false,icon: 'fa-solid fa-triangle-exclamation',columnClass: 's',animation: 'rotateYR',closeAnimation: 'rotateYR',animationBounce: 1.5,animateFromElement: false,closeIcon: true, buttons: {close: {text: 'Đóng',btnClass: 'btn-red',action: function(){}},}});
		}
	    function truy_van(tid){
	    	var t1=getUTC('t1');
	    	var t2=getUTC('t2');
	    	if(t1>t2){
	    		thoi_gian_alert();
	    		return;
	    	}
	    	data_submit['t1']=getVND('t1');
	    	data_submit['t2']=getVND('t2');
	    	data_submit['id']=tid;
	    	if(first_show_dialog){
	    		//do nothing
	    		first_show_dialog=false;
	    	}else{
		    	$('#report-min').html('<div class="spinner-border text-info"></div>');
		    	$('#report-max').html('<div class="spinner-border text-success"></div>');
		    	$('#report-total').html('<div class="spinner-border text-warning"></div>');
	    	}
			$.post('/api/report',
				{
					id: 'id'+tid,
					t1: t1,
					t2: t2,
				},
				function (json) {
					data_submit['min']=json.min;
					data_submit['max']=json.max;
					data_submit['total']=json.total;
					$('#report-min').text(json.min.toFixed(2));
					$('#report-max').text(json.max.toFixed(2));
					$('#report-total').text(json.total.toFixed(2));
					if(json.total>0)
						dialog_report.buttons.print.enable(); 
					else
						dialog_report.buttons.print.disable(); 
				}
			);
	    }
	    function print_report(tid){
		    let frame = document.getElementById("printFrame");
		    let doc = frame.contentWindow.document;
			let data = {min:100, max:130, total:30};
			const ten=['','Cân 2 (Than nguyên khai đầu vào)','Cân 3 (Than tinh số 1)','Cân 4 (Than tinh số 2)'];
			let ten_can=ten[tid];
		    // Ghi nội dung vào iframe
		    doc.open();
		    let domain = window.location.origin;
		    doc.write(`
<html>
<head>
	<title>Print</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<style>
	 @page { size: A4 landscape; margin: 2cm; }
html,body { height:100%; margin:0; padding:0; font-family: "Times New Roman", Times, serif; font-size:16pt}
	 .print-wrapper {
        box-sizing: border-box;
        width:100%;
        min-height:100%;
        padding: 2cm; /* fallback lề 2cm */
      }

      /* chỉ khi in (optional): ẩn overflow, font, v.v. */
      @media print {
        .print-wrapper { overflow: visible; }
         table.in-dam, table.in-dam th, table.in-dam td {
		    border: 1px solid #000 !important; /* ép màu đen */
		  }
	table.in-dam tr{height:50px}
		  /* đảm bảo background không bị in nhạt */
		  table.in-dam {
		    border-collapse: collapse;
		  }
	  }
	  .tieu-de{ padding-top: 20px;padding-bottom: 20px; font-weight:bold;}
      .width-100{ width: 100%;}
	  .text-center{text-align:center;}
	</style>
</head>
<body>
<div class="container-fluid">
	<table width="100%" class="width-100" style="padding:0;margin:0">
	<tr><td rowspan="5"><img id="logo" src="${domain}/images/tisco.png" width="100px"></td></tr>
	<tr><th class="text-center" align="center">C.TY CỔ PHẦN GANG THÉP THÁI NGUYÊN - TISCO</th><th class="text-center" align="center">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</th></tr>
	<tr><th class="text-center" align="center">MỎ THAN PHẤN MỄ</th><th class="text-center" align="center">Độc lập - Tự do - Hạnh phúc</th></tr>
	<tr><td class="text-center" align="center">———————————</td><td class="text-center" align="center">————————————————</td></tr>
	<tr><td class="text-center" align="center">Phiếu số 1</td><td></td></tr>
	</table>
	<h3 class="text-center tieu-de width-100">BÁO CÁO SẢN LƯỢNG THAN QUA CÂN BĂNG TẢI</h3>
	<table width="100%" class="width-100" style="padding:0;margin:0">
		<tr>
			<td width="50%" align="left">TÊN CÂN BĂNG: <b>${ten_can}</b></td>
			<td width="50%" align="right">${_getVND(new Date())}</td>
		</tr>
	</table>
	<table class="table table-bordered in-dam width-100">
	<tr><th class="text-center">TT</th><th class="text-center">Thời gian bắt đầu</th><th class="text-center">Thời gian kết thúc</th><th class="text-center">Trị số đầu<br>(Tấn)</th><th class="text-center">Trị số cuối<br>(Tấn)</th><th class="text-center">Khối lượng hàng<br>(Tấn)</th><th class="text-center">Độ ẩm<br>(%)</th><th class="text-center">Khối lượng ẩm<br>(Tấn)</th></tr>
	<tr><td class="text-center">1</td><td class="text-center">${data_submit.t1}</td><td class="text-center">${data_submit.t2}</td><td class="text-center">${data_submit.min}</td><td class="text-center">${data_submit.max}</td><td class="text-center">${data_submit.total}</td><td class="text-center">0.00</td><td class="text-center">0.00</td></tr>
	<tr><td class="text-end" colspan="5" align="right">Khối lượng quy về (Tấn)</td><td class="text-center" colspan="3"><b>${data_submit.total}</b></td></tr>
    </table>
    <br>
    <table width="100%" class="width-100" style="padding:0;margin:0">
    	<tr>
    		<td class="text-center" width="25%">NGƯỜI NHẬN<BR>(ký, ghi rõ họ tên)</td>
        	<td class="text-center" width="25%">KCS<BR>(ký, ghi rõ họ tên)</td>
        	<td class="text-center" width="25%">NGƯỜI GIAO<BR>(Ký, ghi rõ họ tên)</td>
        	<td class="text-center" width="25%">NGƯỜI CÂN<BR>(ký, ghi rõ họ tên)</td>
    	</tr>
    </table>
</div>
</body>
</html>
		    `);
		    doc.close();
		    // Chờ ảnh trong iframe load xong
			doc.getElementById('logo').onload = () => {
			  frame.contentWindow.focus();
			  frame.contentWindow.print();
			};
	    }
		var dialog_report = $.confirm({
            scrollToPreviousElement: false,
            title: `Báo cáo số liệu cân băng ${tid+1}`,
            content: content,
            icon: 'fa-solid fa-print',
            columnClass: 'l',
            type: 'blue',
            animation: 'rotateYR',
            closeAnimation: 'rotateYR',
            animationBounce: 1.5,
            animateFromElement: false,
            closeIcon: true,
            buttons: {
                data: {
                    text: '<span title="Vẽ đồ thị Tổng trong khoảng thời gian đã chọn"><i class="fa-solid fa-search"></i> Chi tiết</span>',
                    btnClass: 'btn-primary',
                    action: function () {
             			var sid = parseInt(tid)*10+4;
			            var found = all_grafana.find(item => {
			                var ids = JSON.parse('[' + item.ids + ']');
			                return ids.includes(sid%100);
			            });
			            if (found) {
			            	var t1=getEpoch('t1');
					    	var t2=getEpoch('t2');
					    	if(t1>t2){
					    		thoi_gian_alert();
					    		return false;
					    	}
			                show_grafana(tid,found,t1,t2);
			            } else {
			                bao_loi("Không tìm thấy đồ thị phù hợp cho sid: " + sid);
			            }
                        return false;
                    },
                },
                print: {
                    text: '<span title="Sử dụng trình duyệt Chrome để bản in ra giấy được tốt nhất"><i class="fa-solid fa-print"></i> Print</span>',
                    btnClass: 'btn-info',
                    action: function () {
                    	print_report(tid);
                        return false;
                    },
                    isDisabled: true
                },
                close: {
                    text: 'Đóng',
                    keys: ['esc'],
                    btnClass: 'btn-danger',
                    action: function () {
                        this.close();
                    }
                }
            },
            onContentReady: function () {
                fix_dialog();
                truy_van(tid);
                $('.cmd-truy-van').click(function(){
                	truy_van(tid);
	            });
	            
            }
        });
    }
    function show_table(data) {
    	for(var tid in all_tid){
    		var can = gen_can_layout(data, tid);
    		$('.sensor-can-'+tid).html(can);
    		var table = gen_table(data, tid);
        	$('.sensor-table-'+tid).html(table);
    	}
    	$('.cmd-report').click(function () {
    		var tid = $(this).data('tid');
    		tid=parseInt(tid);
    		show_report(tid);
    	});
        $('.sensor-item').click(function (e) {
        	e.preventDefault();
            var sid = $(this).data('sid');
            sid=parseInt(sid);
            var found = all_grafana.find(item => {
                var ids = JSON.parse('[' + item.ids + ']');
                return ids.includes(sid%100);
            });
            if (found) {
            	var tid = parseInt(sid/10);
                show_grafana(tid,found);
            } else {
                bao_loi("Không tìm thấy đồ thị phù hợp cho sid: " + sid);
            }
        });

    }
    function bao_loi(error) {
        $.confirm({
            scrollToPreviousElement: false,
            title: 'Error',
            content: error,
            icon: 'fa-solid fa-triangle-exclamation',
            columnClass: 'm',
            type: 'red',
            animation: 'rotateYR',
            closeAnimation: 'rotateYR',
            animationBounce: 1.5,
            animateFromElement: false,
            closeIcon: true,
            buttons: {
                close: {
                    text: 'Đóng',
                    keys: ['esc'],
                    btnClass: 'btn-danger',
                    action: function () {
                        this.close();
                    }
                }
            },
        });
    }
    function fix_dialog() {
        $('.jconfirm-holder').width($('.jconfirm-open').width());
    }
    function get_ifrsrc(g, from, to, var_name = 'id', var_val = 1) {
        const secure = window.location.protocol === "https:" ? "s" : "";
        const host = window.location.host;
        const path = `grafana/d-solo/${g}?orgId=1&from=${from}&to=${to}&var-${var_name}=${var_val}&themex=light&timezone=browser&refresh=auto&panelId=1&__feature.dashboardSceneSolo=1&kiosk=tv`;
        let rnd = Math.random(); // từ 0 đến <1
        const ifrsrc = `http${secure}://${host}/${path}&rnd=${rnd}`;
        return ifrsrc;
    }
    function show_grafana(tid,gi, from='now-4h', to='now') {
        const g = gi.gid;
        if (g == 'x') {
            bao_loi("Không có đồ thị nào được cấu hình cho SID này.");
            return;
        }
        var var_name = 'id', var_val = tid;
        var ifrsrc = get_ifrsrc(g, from, to, var_name, var_val);
		const TITLE={'load':'Tải trọng','speed':'Tốc độ','rate':'Lưu lượng','total':'Tổng tích lũy','total2':'Tổng tích lũy (ROM)'};
        var dialog_grafana = $.confirm({
            scrollToPreviousElement: false,
            title: TITLE[gi.name] + ' - Cân băng '+(tid+1),
            content: `<iframe id="grafana-frame" src="${ifrsrc}" width="100%" height="500px" frameborder="0"></iframe>`,
            icon: 'fa-solid fa-magnifying-glass-chart',
            columnClass: 'xl',
            type: 'blue',
            animation: 'rotateYR',
            closeAnimation: 'rotateYR',
            animationBounce: 1.5,
            animateFromElement: false,
            closeIcon: true,
            buttons: {
                d30: {
                    text: '30d',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-30d', 'now', var_name, var_val);
                        return false;
                    }
                },
                d7: {
                    text: '7d',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-7d', 'now', var_name, var_val);
                        return false;
                    }
                },
                d1: {
                    text: '1d',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-1d', 'now', var_name, var_val);
                        return false;
                    }
                },
                h8: {
                    text: '8h',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-8h', 'now', var_name, var_val);
                        return false;
                    }
                },
                h4: {
                    text: '4h',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-4h', 'now', var_name, var_val);
                        return false;
                    }
                },
                h1: {
                    text: '1h',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-1h', 'now', var_name, var_val);
                        return false;
                    }
                },
                m30: {
                    text: '30m',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-30m', 'now', var_name, var_val);
                        return false;
                    }
                },
                m5: {
                    text: '5m',
                    btnClass: 'btn-info',
                    action: function () {
                        const iframe = document.getElementById("grafana-frame");
                        iframe.src = get_ifrsrc(g, 'now-5m', 'now', var_name, var_val);
                        return false;
                    }
                },
                close: {
                    text: 'Đóng',
                    keys: ['esc'],
                    btnClass: 'btn-danger',
                    action: function () {
                        this.close();
                    }
                }
            },
            onContentReady: function () {
                fix_dialog();
                const iframe = document.getElementById("grafana-frame");
                iframe.onload = () => {
                    const css = `
				    .navbar__logo, .gf-logo, .branding, .css-1t9sng7 {
				      display: none !important;
				    }
				  `;
                    const style = iframe.contentDocument.createElement('style');
                    style.innerHTML = css;
                    iframe.contentDocument.head.appendChild(style);
                };
            }
        });
    }
    function ago(ss) {
        let mm = Math.floor(ss / 60);
        let hh = Math.floor(mm / 60);
        mm = mm % 60;
        ss = ss % 60;
        if (hh > 0)
            return `${String(hh)}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        else
            return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }

    function tik_tak() {
        setInterval(() => {
            document.querySelectorAll(".time").forEach(td => {
                let ss = parseInt(td.getAttribute("ss")) || 0;
                ss++;
                td.setAttribute("ss", ss);
                td.innerText = ago(ss);
            });
        }, 1000);
    }
    function get_grafana() {
        fetch("/api/grafana")
            .then(res => res.json())
            .then(data => {
                all_grafana = data;
            })
            .catch(err => {
                console.error("Lỗi khi lấy dữ liệu grafana:", err);
            });
    }
    function show_sensor_init() {
        fetch("/api/sensor")
            .then(res => res.json())
            .then(data => {
            	all_sensor = data;
        		var min_tid={};
            	for (const item of data) {
					sensor_map[item.id] = item;
					all_tid[item.tid]=item.tid;
					if(item.ss>0){
						min_tid[item.tid]=min_tid[item.tid]||item.ss;
						if(item.ss < min_tid[item.tid])min_tid[item.tid]=item.ss;
					}
				}
				show_table(data);
                for(var tid in min_tid){
                	$(`.update-time-${tid}`).attr('ss', min_tid[tid]);
				}
				
                get_grafana();
            })
            .catch(err => {
                console.error("Lỗi khi lấy dữ liệu sensor:", err);
            });
    }
    function web_init() {
    	$('.cmd-logout').removeClass('not-show');
        show_sensor_init();
      	connectWS();
        tik_tak();
    	setTimeout(function(){
    		const src_total='/grafana/d-solo/de86344f-d154-4996-87fe-e525418823a2?orgId=1&from=now-7d&to=now&var-id=1&themex=light&timezone=browser&refresh=5m&panelId=1&__feature.dashboardSceneSolo=1&kiosk=tv&rnd='+Math.random();
	        $("#grafana-frame-total").prop("src", src_total);
    		setTimeout(function(){
    			const src_rate='/grafana/d-solo/6a58887a-9527-45fc-a02f-1de79faf88fe?orgId=1&from=now-1h&to=now&var-id=1&themex=light&timezone=browser&refresh=1m&panelId=1&__feature.dashboardSceneSolo=1&kiosk=tv&rnd='+Math.random();
		        $("#grafana-frame-rate").prop("src", src_rate);
	    		setTimeout(function(){
			        const src_speed='/grafana/d-solo/7ef8879f-1403-4cba-a9a9-f1e25f1743a8?orgId=1&from=now-1h&to=now&var-id=1&themex=light&timezone=browser&refresh=1m&panelId=1&__feature.dashboardSceneSolo=1&kiosk=tv&rnd='+Math.random();
			        $("#grafana-frame-speed").prop("src", src_speed);
    			},2000);
	    	},2000);
    	},2000);
    }
function do_login() {
		let uidck = get_store('uid');
		if (!uidck) uidck = '';
		if (uidck === undefined) uidck = '';
		$('.cmd-logout').addClass('not-show');
		let dialogLogin = $.confirm({
			lazyOpen: true,
			title: '<i class="fa fa-key" aria-hidden="true"></i> Login system',
			content: '' +
				'<form action="" class="formName">' +
				'<div class="form-group">' +
				'<label>Username:</label>' +
				'<input type="text" placeholder="Enter Username" class="uid form-control" value="' + uidck + '" required />' +
				'</div>' +
				'<div class="form-group">' +
				'<label>Password:</label>' +
				'<input type="password" placeholder="Enter password" class="pwd form-control" required />' +
				'</div>' +
				'</form>',
			escapeKey: 'cancel',
			buttons: {
				formSubmit: {
					text: 'Login',
					btnClass: 'btn-blue cmd-submit',
					action: function () {
						let uid = this.$content.find('.uid').val();
						let pwd = this.$content.find('.pwd').val();
						if (uid == '') {
							this.$content.find('.uid').focus();
							return false;
						}
						if (pwd == '') {
							this.$content.find('.pwd').focus();
							return false;
						}
						let dialog_wait_login = $.confirm({
							title: 'Submit and Process...',
							content: 'Please wait a few second...',
							buttons: {
								ok: {}
							}
						});
						$.post('/api/login',
							{
								uid: uid,
								pwd: pwd,
							},
								function (json) {
								dialog_wait_login.close();
								logined = json.ok;
								if (logined) {
									user_info = json;
									localStorage.logined =JSON.stringify(json);
									setLocal("uid", json.uid)
									setLocal("ck", json.ck)
									setCookie('uid', json.uid);
									setCookie('ck', json.ck, 30);
									dialogLogin.close();
									web_init();
								} else {
									// khi login not ok
									$.confirm({
										title: 'Warning',
										escapeKey: 'ok',
										content: 'Có gì đó sai sai, vui lòng thử lại',
										autoClose: 'OK|5000',
										escapeKey: 'OK',
										buttons: {
											OK: {
												text: 'Close',
												keys: ['enter', 't'],
												btnClass: 'btn-red',
												action: function () {
												}
											},
										},
										onDestroy: function () {
											dialogLogin.$content.find('.pwd').focus();
										}
									})
								}
							});
						return false;
					}
				}
			},
			onContentReady: function () {
				//$('#cmdLogin').addClass("active");
				let self = this;
				let uid = get_store('uid');
				if (uidck == '')
					self.$content.find('.uid').focus();
				else
					self.$content.find('.pwd').focus();
				self.$content.find('.uid').keyup(function (event) {
					if (event.keyCode === 13) {
						if (self.$content.find('.uid').val() == '')
							this.$content.find('.uid').focus();
						else
							self.$content.find('.pwd').focus();
					}
				});
				self.$content.find('.pwd').keyup(function (event) {
					if (event.keyCode === 13) {
						if (self.$content.find('.uid').val() == '')
							this.$content.find('.uid').focus();
						else if (self.$content.find('.pwd').val() == '')
							this.$content.find('.pwd').focus();
						else {
							let x = $.find('.cmd-submit');
							x[0].click();
						}
					}
				});
			}
		});
		dialogLogin.open();
	}
	function do_logout(){
		let ck = get_store('ck');
		let uid = get_store('uid');
		if (ck != null && uid != null) {
			$.post('/api/logout',
				{
					ck: ck,
					uid: uid,
				},
					function (json) {
					if (json.ok) {
						localStorage.clear();
						eraseCookie('uid');
						eraseCookie('ck');
						location.reload();
					}
				});
		} 
	}
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
						localStorage.logined = JSON.stringify(json);
						setLocal("uid", json.uid)
						setLocal("ck", json.ck)
						setCookie('uid', json.uid);
						setCookie('ck', json.ck, 30);
						console.log('logined');
						web_init();
					}else{
						console.log('not login.');
						do_login();
					}
				});
		} else {
			console.log('not login');
			do_login();
		}
	}
	$('.cmd-logout').click(function(){do_logout();});
    check_login();
    //web_init();
});