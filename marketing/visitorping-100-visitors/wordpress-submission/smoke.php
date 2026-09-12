<?php
function vp_assert($condition, $message) { if (!$condition) { throw new Exception($message); } echo "PASS: $message\n"; }
$tracker = new VisitorPing_Tracker();
update_option('visitorping_settings', array());
vp_assert(!$tracker->should_track(), 'Unconfigured site does not track');
update_option('visitorping_settings', array('site_key'=>'not-valid'));
vp_assert(!$tracker->should_track(), 'Invalid site key does not track');
update_option('visitorping_settings', array('site_key'=>'vp_ABC23456'));
wp_set_current_user(0);
vp_assert($tracker->should_track(), 'Configured public visit can track');
ob_start(); $tracker->render_tracking_script(); $script=ob_get_clean();
vp_assert(strpos($script,'https://cdn.visitorping.com/site/vp_ABC23456.js')!==false, 'Expected script URL rendered');
wp_set_current_user(1);
vp_assert(!$tracker->should_track(), 'Logged-in administrator excluded by default');
wp_set_current_user(0);
add_filter('visitorping_should_track','__return_false');
vp_assert(!$tracker->should_track(), 'Consent filter can suppress script');
remove_filter('visitorping_should_track','__return_false');
$publisher = new VisitorPing_Publisher();
$request = new WP_REST_Request('POST','/visitorping/v1/drafts');
vp_assert(is_wp_error($publisher->authorize_request($request)), 'Publishing disabled by default');
update_option('visitorping_settings', array('site_key'=>'vp_ABC23456','publishing_enabled'=>true,'publishing_secret'=>'disposable-test-secret'));
$request->set_header('x-visitorping-timestamp',(string)time());
$request->set_header('x-visitorping-signature','invalid');
vp_assert(is_wp_error($publisher->authorize_request($request)), 'Invalid publishing signature denied');
