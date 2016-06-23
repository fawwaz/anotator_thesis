(function(){
	var app = angular.module('MyApp', ['ui.router','ngCookies','ngtweet']);
	// var app = angular.module('MyApp', ['ui.router','ngCookies']);
	// local
	var server_basename = "http://localhost/tesisfawwaz";
	// var server_basename = "http://192.168.1.6/tesisfawwaz";
	// deployment
	// var server_basename = "http://tesisfawwaz.hol.es";

	app.service('DBase',['$http','$q',function($http,$q){
		var Dbase={};

		// WARNING WARNNG WARNING WARNNG WARNING  sementara ini di limit dulu ... 
		// Mengambil yang belum diberi label (sekali saja setiap kali run)
		Dbase.getUnlabelledData = function(session,lower_limit,callback){
			$http.get(server_basename+"/api/unlabelled_data",{
				params:{
					session:session,
					lower_limit:lower_limit
				}
			}).then(function(response){
				callback(response);
			});
		}

		// Mengambil group token berdasarkan tweet_id
		Dbase.getTokenGroup = function(twitter_tweet_id,callback){
			$http.get(server_basename+"/api/get_token_group",{
				params:{
					twitter_tweet_id:twitter_tweet_id
				}
			}).then(function(response){
				console.log("response token group");
				console.log(response);
				callback(response);
			});
		}

		// Send Data to server
		// Dbase.saveLabels = function(datas,session,is_labelled_code,callback){
		Dbase.saveLabels = function(datas,session,is_labelled_code,twitter_tweet_id,callback){
			console.log("Save labels");
			console.log("is_labelled_code : "+is_labelled_code);
			console.log("twitter_tweet_id is : "+twitter_tweet_id)

			console.log(session);
			$http.get(server_basename+'/api/update_label',{
				params:{
					datas:JSON.stringify(datas),
					session:session,
					is_labelled_code:is_labelled_code,
					twitter_tweet_id:twitter_tweet_id
				}
			}).then(function(response){
				console.log("response save label adalah : ");
				console.log(response);
				callback(response);
			});
		}

		return Dbase;
	}]);


	app.config(['$stateProvider','$urlRouterProvider',function($stateProvider,$urlRouterProvider) {
		$urlRouterProvider.otherwise('/home');
		$stateProvider
		.state('home',{
			url:'/home',
			templateUrl:'views/partials/home.html',
			controller:'HomeController'
		}).state('settings',{
			url:'/settings',
			templateUrl:'views/partials/settings.html',
			controller:'SettingsController'
		}).state('login',{
			url:'/login',
			templateUrl:'views/partials/login.html',
			controller:'LoginController'
		}).state('help',{
			url:'/help',
			templateUrl:'views/partials/help.html'
		});
	}]);

	app.controller('HomeController', ['$scope','DBase','$cookieStore','$state','$compile','$window',function($scope,DBase,$cookieStore,$state,$compile,$window){
		// Variable Global
		$scope.level_completed		= false;
		$scope.active_label			= 'other';
		$scope.button_classes		= ["EventNameText","EventLocationText","EventTimeText","EventContactText","EventOtherText"];
		$scope.current_tweet		= 0; // menandakan index array ke-berapa yang akan diambil, diincrement setiap kali berhasil submit.
		$scope.buffer_input			= [];
		$scope.unlabelled_counter	= 5000;
		$scope.is_unlabelled_data_retrieved = false;
		$scope.sending_to_server	= false;

		function checkCookie(){
			if($cookieStore.get("lower_limit_tesis_fawwaz")==null){
				$state.go("settings");
			}else{
				$scope.user_lower_limit = $cookieStore.get("lower_limit_tesis_fawwaz");
			}
			if($cookieStore.get("username_tesis_fawwaz")==null){
				$state.go("login");
			}else{
				$scope.active_user = $cookieStore.get("username_tesis_fawwaz");
			}



		}
		checkCookie();

		// Hash map of object
		function getIdBufferInput(seq_num){
			for (var i = 0; i < $scope.buffer_input.length; i++) {
				if($scope.buffer_input[i].sequence_num == seq_num){
					return i;
				}
			};
			return -1; // default value when not exist
		}

		function InsertOrUpdateBufferInput(seq_num,label){
			var index = getIdBufferInput(seq_num);
			if(index == -1){
				$scope.buffer_input.push({sequence_num:seq_num,label:label});
			}else{
				$scope.buffer_input[index].label = label;
			}
		}


		// Digunakan untuk mengambil daftar id yang belum diberi label, dijalankan sekali selama satu sesi anotasi
		// Menggunakan label is_unlabelled_data_retrieved untuk menandai apakah sudah data sudah diteirma oleh browser (ingat javascript adalah asynchronous)
		$scope.is_unlabelled_data_retrieved = false; // kalau tidak digunakan hapus saja ..
		function getUnLabelledData(){
			DBase.getUnlabelledData($scope.active_user,$scope.user_lower_limit, function(response){
				if(response.data.result.length>0){
					$scope.unlabelled_tweet_ids = response.data.result;
					loadTokenToScreen(); // pertamakali otomatis run juga..
				}else{
					$scope.level_completed = true;
					// level udah selesai ..
				}
			});
		}
		getUnLabelledData(); 

		// Menampilkan daftar token untuk ditampilkan ke layar
		function loadTokenToScreen(){
			var selected_tweet_id = $scope.unlabelled_tweet_ids[$scope.current_tweet].id;
			$scope.active_tweet_id = selected_tweet_id;
			$scope.unlabelled_counter = $scope.unlabelled_tweet_ids.length;
			DBase.getTokenGroup(selected_tweet_id,function(response){
				$scope.tokens = response.data.result;
				$scope.active_num = response.data.result[0].sequence_num;

				// Generate buffer input default
				$scope.buffer_input = [];
				for (var i = 0; i < $scope.tokens.length; i++) {
					if($scope.tokens[i]["label_"+$scope.active_user]==null){
						InsertOrUpdateBufferInput($scope.tokens[i].sequence_num, 'other');
					}else{
						console.log($scope.tokens[i]["label_"+$scope.active_user]);
						InsertOrUpdateBufferInput($scope.tokens[i].sequence_num, $scope.tokens[i]["label_"+$scope.active_user]);
					}
				};

				$scope.is_unlabelled_data_retrieved = true;
				$scope.sending_to_server = false;
			});
		}

		$scope.moveToNextTweet = function(){
			if($scope.current_tweet<$scope.unlabelled_tweet_ids.length-1){
				$scope.current_tweet++;
			}
			loadTokenToScreen();
		}

		$scope.moveToPreviousTweet = function(){
			$scope.sending_to_server = true;
			$scope.active_tweet_id = null;
			if($scope.current_tweet>0){
				$scope.current_tweet--;
			}
			loadTokenToScreen();
		}

		$scope.setActiveLabel = function(label){
			$scope.active_label = label;
		}

		$scope.setLabel = function(sequence_num){
			InsertOrUpdateBufferInput(sequence_num,$scope.active_label);
		}



		$scope.getClassFromBufferInput = function(seq_num){
			var css_class = '';
			var selected_label = '';
			for (var i = 0; i < $scope.buffer_input.length; i++) {
				if($scope.buffer_input[i].sequence_num == seq_num){
					selected_label =  $scope.buffer_input[i].label;
				}
			};

			css_class = css_class + "btn btn-sm";
			if(selected_label == 'i-name'){
				// css_class = 'EventNameText';
				css_class = css_class + ' btn-primary';
			}else if(selected_label == 'i-place'){
				// css_class = css_class + 'EventLocationText';
				css_class = css_class + ' btn-success';
			}else if(selected_label == 'i-time'){
				// css_class = css_class + 'EventTimeText';
				css_class = css_class + ' btn-warning';
			}else if(selected_label == 'other'){
				// css_class = css_class + 'EventOtherText';
				css_class = css_class + ' btn-default';
			}else if(selected_label == 'contact'){
				css_class = css_class + 'EventContactText';
			}else{
				css_class = null;
			}


			return css_class;
		}

		$scope.getClassForLabel = function(){
			var css_class = '';
			css_class = css_class + 'label';
			if($scope.active_label == 'i-name'){
				css_class = css_class + ' label-primary';
			}else if($scope.active_label == 'i-place'){
				css_class = css_class + ' label-success';
			}else if($scope.active_label == 'i-time'){
				css_class = css_class + ' label-warning';
			}else if($scope.active_label == 'other'){
				css_class = css_class + ' label-default';
			}
			return css_class;
		}

		$scope.saveLabel = function(){
			var label_code	= 2; // default unlabelled 0 , labelled as important = 1, unimportant = 2
			var stop_loop	= false;
			for (var i = 0; (i < $scope.buffer_input.length)&&(!stop_loop); i++) {
				if($scope.buffer_input[i].label!="other"){
					label_code = 1;
					stop_loop = true;
				}
			};
			var the_id = $scope.unlabelled_tweet_ids[$scope.current_tweet].id;
			console.log("Twitter tweet id : "+the_id);
			console.log("Label Code  : "+label_code);

			$scope.sending_to_server = true;
			$scope.active_tweet_id = undefined;
			DBase.saveLabels($scope.buffer_input,$scope.active_user,label_code,the_id,function(response){
				// if not the last id..
				if($scope.unlabelled_counter>1){
					$scope.moveToNextTweet();
				}else{
					$scope.level_completed = true;
				}
				$scope.unlabelled_counter--;
			});
		}

		$scope.$watch("unlabelled_counter",function(newvalue,oldvalue){
			var maximum		= 5000;
			$scope.progress	= (maximum-$scope.unlabelled_counter) / maximum * 100;
			console.log("progress :"+$scope.progress);
		});

		$scope.logout = function(){
			$cookieStore.remove("username_tesis_fawwaz");
			$state.go('login');
		}

		$scope.previewTweet = function(){
			$window.open('http://twitter.com/fawwaz_muhammad/status/'+$scope.unlabelled_tweet_ids[$scope.current_tweet].id,'Tweet preview','target=_blank,width=400,height=400');
		}

	}]);

	app.controller('SettingsController', ['$scope','DBase','$cookieStore','$state',function($scope,DBase,$cookieStore,$state){
		
		$scope.levels = [{
			label : "level 1",
			lower_limit: 0
		},{
			label : "level 2",
			lower_limit: 5000
		},{
			label : "level 3",
			lower_limit: 10000
		},{
			label : "level 4",
			lower_limit: 15000
		}];


		$scope.setCookie = function(){
			$cookieStore.put("lower_limit_tesis_fawwaz",$scope.selected_level.lower_limit)
			$state.go('help');
		}

		$scope.logout = function(){
			$cookieStore.remove("username_tesis_fawwaz");
			$state.go('login');
		}
	}]);

	app.controller('LoginController', ['$scope','$cookieStore','$state',function($scope,$cookieStore,$state){
		$scope.error_password = false;

		function changeState(username){
			$cookieStore.put("username_tesis_fawwaz",username);
			$state.go('settings');
		}
		$scope.login = function(){
			var user_1 = ["winnie","dian","nindy","rahma","elian","izzan","burhan","ardityo","mahdan","harridi","felicia","sigit","nisa","hanna","ope","setyo","aji","ninik","windy","nashir","fawwaz1"];
			var user_2 = ["pandu","faiz","arief","ted","alifa","hanif","gias","fajar","riva","fakhri","azzufar","joshua","kaito","azmi","iqbal","nonny","dara","didin","metri","mulki","fawwaz2"];
			
			if($scope.password=="oktoberlulus"){
				if(user_1.indexOf($scope.username)!=-1){
					changeState("anotator1");
				}else if(user_2.indexOf($scope.username)!=-1){
					changeState("anotator2");
				}else{
					changeState("anotator3");
				}		
			}else{
				$scope.error_password = true;
			}
		}
	}]);
})();