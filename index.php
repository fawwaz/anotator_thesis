<?php
require 'flight/Flight.php';
require 'medoo.php';

/*
 ================================================================================
								GLOBAL VARIABLES 								
 ================================================================================
*/

$database = new medoo([
	// development
	'database_type'	=> 'mysql',
	'database_name'	=> 'mytomcatapp',
	'server'		=> 'localhost',
	'username'		=> 'root',
	'password'		=> '',
	'charset'		=> 'utf8mb4',

	// deployment
	// 'database_type'	=> 'mysql',
	// 'database_name'	=> 'u354827813_akun',
	// 'server'		=> 'localhost',
	// 'username'		=> 'u354827813_akun',
	// 'password'		=> 'akun1234', // jangan lupa diganti cuk ..
	// 'charset'		=> 'utf8mb4',
]);


$db_name 	 = "mytomcatapp";
$table_token = "tweet_baru_sanitized_tokenized_no_url";
$table_tweet = "tweet_baru_sanitized";

/*
 ================================================================================
								   API LIST      								
 ================================================================================
*/


Flight::route('/', function(){
    Flight::render('index');
});

Flight::route('/all',function() use($database,$table_token,$table_tweet,$db_name){
	//$datas = $database->select($table_tweet,["id","text"]);
	$datas = $database->select($table_token,["token","twitter_tweet_id","sequence_num"]);
	$response = array(
		"status"		=> "OK",
		"response_code"	=> 200,
		"result"		=> $datas
	);

	Flight::json($response);
});

Flight::route('/api/unlabelled_data',function() use($database,$table_tweet){
	// $datas = $database->query("SELECT * from (SELECT * from tweet_baru_sanitized limit ".$lower_limit.",5000) as t WHERE t.is_labelled_anotator1 != 0")->fetchAll();
	$column_anotator	= "is_labelled_".$_GET['session'];
	$lower_limit		= $_GET['lower_limit'];
	// $datas = $database->query("SELECT t.* from (SELECT * from tweet_baru_sanitized limit ".$lower_limit.",5) as t WHERE t.".$column_anotator." = 0")->fetchAll();
	$datas = $database->query("SELECT t.* from (SELECT * from tweet_baru_sanitized limit ".$lower_limit.",5000) as t WHERE t.".$column_anotator." = 0")->fetchAll();

	/*
	Flight::route('/api/set') dst ..

	"SELECT * FROM tweet_baru where is_labelled = 0 limit 90,40";
	"UPDATE tweet_baru SET is_labelled = 1 where id = ?";
	"SELECT * FROM tweet_baru_tokenized where twitter_tweet_id = ?";
	"UPDATE tweet_baru_tokenized SET label2 ? WHERE sequence_num = ?";
	"SELECT * FROM tweet_baru LIMIT 1000, 1000";
	"SELECT * FROM tweet_baru_tokenized as t1 INNER JOIN (select id from tweet_baru limit 10) as t2 ON t1.twitter_tweet_id = t2.id";
	*/
	$response = array(
		"status"		=> "OK",
		"response_code"	=> 200,
		"result"		=> $datas
	);

	header("Access-Control-Allow-Origin: *");
	Flight::json($response);
});

Flight::route('/api/get_token_group', function() use($database,$table_token){

	//$datas = $database->select($table_token,["token","twitter_tweet_id","sequence_num"],["twiter_tweet_id"=>$_GET['twitter_tweet_id']]);
	$datas = $database->query("SELECT * FROM tweet_baru_sanitized_tokenized_no_url where twitter_tweet_id = ".$_GET['twitter_tweet_id'])->fetchAll();
	
	
	$response = array(
		"status"		=> "OK",
		"response_code"	=> 200,
		"result"		=> $datas
	);

	header("Access-Control-Allow-Origin: *");
	Flight::json($response);
});

Flight::route('/api/update_label', function() use($database,$table_token,$table_tweet){
	
	$datas				= json_decode($_GET['datas']);
	$column_anotator	= "label_".$_GET['session'];

	foreach ($datas as $key => $value) {
		$result = $database->update($table_token,
			[$column_anotator=>$value->label],
			["sequence_num"=>((int)$value->sequence_num)]
		);
	}

	// STEP 2 : update the is_labelled in related column

	$column_anotator	= "is_labelled_".$_GET['session'];
	$is_labelled_code	= ((int)$_GET['is_labelled_code']);
	$twitter_tweet_id	= ((string)$_GET['twitter_tweet_id']);
	$result				= $database->query("UPDATE `".$table_tweet."` SET `". $column_anotator."` = ". ((int)$is_labelled_code). " WHERE id=".$twitter_tweet_id)->fetchAll();

	$response = array(
		"status"		=> "OK",
		"response_code"	=> 200,
		"result"		=> $result
	);

	header("Access-Control-Allow-Origin: *");
	Flight::json($response);
});

Flight::route('/api/count',function() use($database,$table_tweet){
	$column_anotator	= "is_labelled_".$_GET['session'];
	$lower_limit		= $_GET['lower_limit'];
	$datas = "lagi di comment coy printah mysqlnya ";
	// $datas				= $database->query("SELECT count(*) as counter from (select ".$column_anotator." from tweet_baru_sanitized limit ".$lower_limit.",5000) as t WHERE t.".$column_anotator." != 0")->fetchAll();
	// $datas				= $database->query("SELECT count(*) as counter from (select ".$column_anotator." from tweet_baru_sanitized limit ".$lower_limit.",5000) as t WHERE t.".$column_anotator." != 0")->fetchAll();

	$response = array(
		"status"		=> "OK",
		"response_code"	=> 200,
		"result"		=> $datas
	);

	header("Access-Control-Allow-Origin: *");
	Flight::json($response);
});


Flight::route('/tes',function(){
	$response = array(
		"status"		=> "OK",
		"response_code"	=> 200,
		"result"		=> "tes aja kok bisa gak"
	);

	Flight::json($response);
});

Flight::start();
?>
