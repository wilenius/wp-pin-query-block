<?php
/**
 * Server-side rendering for the Featured Content block.
 *
 * @package wp-pin-query-block
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block inner content.
 * @var WP_Block $block      Block instance.
 */

if ( empty( $attributes['pinnedPosts'] ) ) {
	return '';
}

$pinned_ids = array_map( function ( $pin ) {
	return (int) $pin['id'];
}, $attributes['pinnedPosts'] );

$columns = isset( $attributes['columns'] ) ? (int) $attributes['columns'] : 3;

$posts = get_posts( array(
	'post__in'       => $pinned_ids,
	'post_type'      => array( 'post', 'tribe_events' ),
	'post_status'    => 'publish',
	'orderby'        => 'post__in',
	'posts_per_page' => count( $pinned_ids ),
) );

if ( empty( $posts ) ) {
	return '';
}

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'wp-pin-query-grid',
	'style' => '--pin-query-columns: ' . $columns . ';',
) );
?>
<div <?php echo $wrapper_attributes; ?>>
	<?php foreach ( $posts as $post ) : ?>
		<article class="wp-pin-query-card">
			<?php if ( has_post_thumbnail( $post ) ) : ?>
				<div class="wp-pin-query-card__image">
					<a href="<?php echo esc_url( get_permalink( $post ) ); ?>">
						<?php echo get_the_post_thumbnail( $post, 'medium_large' ); ?>
					</a>
				</div>
			<?php endif; ?>

			<div class="wp-pin-query-card__content">
				<span class="wp-pin-query-card__type">
					<?php echo esc_html( get_post_type_object( $post->post_type )->labels->singular_name ); ?>
				</span>

				<h3 class="wp-pin-query-card__title">
					<a href="<?php echo esc_url( get_permalink( $post ) ); ?>">
						<?php echo esc_html( get_the_title( $post ) ); ?>
					</a>
				</h3>

				<div class="wp-pin-query-card__date">
					<?php
					if ( 'tribe_events' === $post->post_type ) {
						$event_date = get_post_meta( $post->ID, '_EventStartDate', true );
						if ( $event_date ) {
							echo esc_html( wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $event_date ) ) );
						}
					} else {
						echo esc_html( get_the_date( '', $post ) );
					}
					?>
				</div>

				<?php if ( has_excerpt( $post ) || $post->post_content ) : ?>
					<div class="wp-pin-query-card__excerpt">
						<?php echo esc_html( wp_trim_words( get_the_excerpt( $post ), 20 ) ); ?>
					</div>
				<?php endif; ?>
			</div>
		</article>
	<?php endforeach; ?>
</div>
