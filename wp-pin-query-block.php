<?php
/**
 * Plugin Name:       Featured Content (Pin Query Block)
 * Description:       Search and pin posts and events to display as featured content.
 * Version:           0.1.0
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Author:
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-pin-query-block
 *
 * @package wp-pin-query-block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the block.
 */
function wp_pin_query_block_init() {
	register_block_type( __DIR__ . '/build' );
}
add_action( 'init', 'wp_pin_query_block_init' );

/**
 * Register REST API endpoint for searching posts and events.
 */
function wp_pin_query_block_register_rest_routes() {
	register_rest_route( 'pin-query/v1', '/search', array(
		'methods'             => 'GET',
		'callback'            => 'wp_pin_query_block_search',
		'permission_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
		'args'                => array(
			'search'   => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'per_page' => array(
				'type'              => 'integer',
				'default'           => 10,
				'sanitize_callback' => 'absint',
			),
		),
	) );
}
add_action( 'rest_api_init', 'wp_pin_query_block_register_rest_routes' );

/**
 * Search callback — queries posts and tribe_events.
 */
function wp_pin_query_block_search( $request ) {
	$search   = $request->get_param( 'search' );
	$per_page = $request->get_param( 'per_page' );

	$post_types = array( 'post' );
	if ( post_type_exists( 'tribe_events' ) ) {
		$post_types[] = 'tribe_events';
	}

	$query = new WP_Query( array(
		's'              => $search,
		'post_type'      => $post_types,
		'post_status'    => 'publish',
		'posts_per_page' => $per_page,
		'orderby'        => 'relevance',
		'order'          => 'DESC',
	) );

	$results = array();
	foreach ( $query->posts as $post ) {
		$thumbnail_id  = get_post_thumbnail_id( $post->ID );
		$thumbnail_url = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, 'thumbnail' ) : '';

		$item = array(
			'id'        => $post->ID,
			'title'     => get_the_title( $post ),
			'type'      => $post->post_type,
			'typeLabel' => get_post_type_object( $post->post_type )->labels->singular_name,
			'thumbnail' => $thumbnail_url,
		);

		if ( 'tribe_events' === $post->post_type ) {
			$item['eventDate'] = get_post_meta( $post->ID, '_EventStartDate', true );
		}

		$results[] = $item;
	}

	return rest_ensure_response( $results );
}
