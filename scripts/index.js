
//Будем кэшировать данные
let map = new Map();


//Функция проверяющая два смежные элементы массива "schedule" на уникальность
function getUnique(data) {

	len = data["schedule"].length;
	for (let i = 1; i < len; i++) {
		if (!data["schedule"][i]) return data;
		if (data["schedule"][i-1]["thread"]["title"] ==
			data["schedule"][i]["thread"]["title"]) {
				data["schedule"].splice(i, 1);
				i--;
		}
	
	}
	return data;
}

//Выполнение одиночного запроса
function getData(url, func) {
	if (map.has(url)) {
		func(map.get(url));
		return;
	}
	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
		
	xhr.send();
		
	xhr.onload = function() { 
		let data = getUnique(JSON.parse(xhr.responseText));
		func(data);	
		map.set(url, data);
	};
		
	xhr.onerror = function() {
		console.log('Error: ' + xhr.status);
	};
}
//Выполнение множества запросов		
function multiGetData(urls, callback) {
	let count = urls.length;
	let result = [];
	if (count === 0) {
		callback(result);
		return;
	}
	
	urls.forEach( function(url, index) {
		getData(url, function(data) {
			result[index] = data;
			count = count - 1;
			if (count === 0) {
				callback(result);
			}
		});
	
	});
	
}



		
//Само табло со значениями 	
mySchedule = new class {
	constructor(elem) {
		this.elem = elem;
		this.rows = 0;
		this.data = null;
	}
			
	setData(data) {
		this.data = data;
	}
			
	clearAll() {
		this.rows = 0;
		this.elem.innerHTML = '';
	}
	
	
	//Вспомогательная функция создания элемента div с контентом		
	_getDiv(content, class_name) {
		let div = document.createElement('div');
		div.textContent = content;
		div.className = class_name;
		return div;
	}
	//Создание строки табло		
	createRow() {
		//Так как в данных зачастую не указан номер терминала, то для
		//упрощения задачи будем его генерироваь случайным образом
		function randomTerminal() {
			let terminals = ['A', 'B', 'C', 'D', 'E', 'F']
			return terminals[Math.floor(Math.random() * 
				terminals.length)];
		}
		
		if (!this.data["schedule"][this.rows]) return;
	
		let plane = this.data["schedule"][this.rows];
		let div = this._getDiv('', 'row separator');
		if (this.data["event"] == "arrival") {
			div.appendChild(this._getDiv("Время прибытия: " + 
				plane["arrival"],
				"time three columns"));
		} else if (this.data["event"] == "departure") {
			div.appendChild(this._getDiv("Время вылета: " + 
				plane["departure"],
				"time three columns"));
		} else if (this.data["event"] == "delayed_flights") {
			div.appendChild(this._getDiv("Самолет задерживается с вылетом." + 
				" Время вылета по расписанию: " + plane["departure"],
					"time three columns"));
		} else {
			if (plane["departure"]) {
				div.appendChild(this._getDiv(plane["departure"],
						"time three columns"));
			} else {
				div.appendChild(this._getDiv(plane["arrival"],
					"time three columns"));
			}
		}			
		div.appendChild(this._getDiv(plane["thread"]["title"],
			"title three columns"));
		div.appendChild(this._getDiv("Самолет № " + plane["thread"]["number"],
			"number three columns"));
		if (!plane["terminal"]) {
			plane["terminal"] = randomTerminal();
		}
		div.appendChild(this._getDiv("Терминал " + plane["terminal"],
			"terminal three columns"));
		this.rows++;
		return div;
	}
			
	//Дополнение инфорации по мере надобности		
	update() {
		if (!this.data) return;
		for (let i = 0; i < 3; i++) {
			let row = this.createRow();

			if (!row) return;

			this.elem.appendChild(row);
		}

	}
	//Инициализация табо с рейсами		
	render(data) {
		this.clearAll(); 
		this.setData(data);
		let fragment = document.createDocumentFragment();
		let len;
		if (this.data["schedule"].length == 0) {
			this.elem.appendChild(this._getDiv("К сожалению, по Вашему" +
				" запросу ничего не найдено.", "row"));
			return;
		}
		this.data["schedule"].length > 10 ? len = 20 : 
			len = this.data["schedule"].length;
		for (let i = 0; i < len; i++) {
			let div = this.createRow();
			if (!div) break;
			fragment.appendChild(div);
		}
		this.elem.appendChild(fragment);
	}
			
}(document.body.getElementsByClassName("schedule")[0]);
					
		

//Переключатели режимов табло
let pointers = new class {
	constructor(elem) {
		this.elem = elem;
		elem.onclick = this._onClick.bind(this);
	}
	
	_onClick(event) {
		let target = event.target;
		if (!target.hasAttribute('data-set-url')) return;
		if (target.classList.contains('finder__style_current')) return;
		let previous = target.parentNode.
			getElementsByClassName("finder__style_current")[0];
		if (previous) previous.classList.
					remove('finder__style_current');
		target.classList.add('finder__style_current');
		let url = target.getAttribute('data-set-url');
		getData(url, mySchedule.render.bind(mySchedule));
	}
	
	
	//Вспомогательное событие для инициализации табло
	_select() {
		let dep = this.elem.firstElementChild;
		let evt = new Event('click', {bubbles: true});
		dep.dispatchEvent(evt);
	}	
	
}(document.body.getElementsByClassName('pointers')[0]);

pointers._select();

//Стрелка, позволяющая пользователю мгновенно прокрутить страницу наверх
let arrow = new class {
	constructor(elem) {
		this.elem = elem;
		elem.onclick = this._onClick.bind(this);
	}
	
	_onClick() {
		this.hide();
		window.scrollTo(0, 0);
	}
	
	hide() {
		this.elem.classList.add('arrow__style_hidden');
	}
	
	display() {
		this.elem.classList.remove('arrow__style_hidden');
	}
	
}(document.body.getElementsByClassName('arrow')[0]);

//поисковик
let finder = new class {
	constructor(form) {
		this.form = form;
		form.onsubmit = this._onSubmit.bind(this);

		this.searchPlane = null
	}
	
	_onSubmit(event) {
		event.preventDefault();
		let searchPlane = this.form.elements["search_bar"].value;
		this.form.elements["search_bar"].value = '';
		this.find(searchPlane);
	}
	
	//Поиск в трех файлах даты
	find(searchPlane) {
		
		function search(data) {
			let requiredData = {event: null, schedule: []};
			for (let i = 0; i < 3; i++) {
				for (let plane of data[i]["schedule"]) {
					if (plane["thread"]["number"] == searchPlane.toUpperCase()) {
						requiredData["schedule"].push(plane);
					}
				}
			}
			requiredData = getUnique(requiredData);
			mySchedule.render.call(mySchedule, requiredData);
		}
		
		
		let urls = ["data/departure.json", "data/arrival_new.json",
			"data/delayed_flights.json"];		
		multiGetData(urls, search);
		
	}
	
	
	
}(document.forms[0]);

//Поставим обработчик на прокрутку, показывающий стрелку мгновенного 
//перемотки страницы наверх и дополняющий строки табло
window.onscroll = function() {
	let pageY = window.pageYOffset || document.documentElement.scrollTop;
	var innerHeight = document.documentElement.clientHeight / 4;
	if (pageY > innerHeight) {
		mySchedule.update.call(mySchedule);
		arrow.display.call(arrow);
	}
	if (pageY < innerHeight) {
		arrow.hide.call(arrow);
	}
};


