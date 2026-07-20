from manim import *

config.background_color = "#0c1220"

METAL_HOT = "#ff9d3d"
METAL_COOL = "#9aa5ad"
MOLD_COPE = "#4a4038"
MOLD_DRAG = "#3a3128"
CHANNEL = "#241d16"
ACCENT = "#ff7a45"
FAINT = "#8a94a3"


def numbered_dot(n, color=WHITE):
    dot = Circle(radius=0.16, color=WHITE, fill_color="#0c1220", fill_opacity=1, stroke_width=1.5)
    label = Text(str(n), font_size=16, color=WHITE, weight=BOLD)
    label.move_to(dot.get_center())
    return VGroup(dot, label)


class CastingScene(Scene):
    def construct(self):
        title = Text("Casting — Sand Mould Cross-Section", font_size=28, color=WHITE, weight=BOLD).to_edge(UP, buff=0.35)
        self.play(FadeIn(title, shift=UP * 0.2), run_time=0.5)

        drag = RoundedRectangle(corner_radius=0.08, width=5.6, height=1.6, color="#5a4c3a", fill_color=MOLD_DRAG, fill_opacity=1, stroke_width=2)
        drag.move_to(DOWN * 1.0)

        cope_closed_y = 0.6
        cope_body = RoundedRectangle(corner_radius=0.08, width=5.6, height=1.6, color="#6a5a45", fill_color=MOLD_COPE, fill_opacity=1, stroke_width=2)
        cope_body.move_to(UP * cope_closed_y)

        sprue = Rectangle(width=0.26, height=1.1, color=CHANNEL, fill_color=CHANNEL, fill_opacity=1, stroke_width=0)
        sprue.move_to(UP * 0.85)

        cup = Polygon(
            [-0.5, 1.4, 0], [0.5, 1.4, 0], [0.16, 1.05, 0], [-0.16, 1.05, 0],
            color=CHANNEL, fill_color=CHANNEL, fill_opacity=1, stroke_width=0,
        )

        riser = Rectangle(width=0.22, height=0.8, color=CHANNEL, fill_color=CHANNEL, fill_opacity=1, stroke_width=0)
        riser.move_to(np.array([1.65, 0.85, 0]))

        cope_group = VGroup(cope_body, sprue, cup, riser)

        cavity_outline = Rectangle(width=0.95, height=1.0, color="#8a7a5a", stroke_width=1.5).set_stroke(opacity=0.8)
        cavity_outline.move_to(DOWN * 0.2)
        cavity_outline.set_fill(opacity=0)

        parting_line = DashedLine(np.array([-2.8, -0.2, 0]), np.array([2.8, -0.2, 0]), color=ACCENT, stroke_width=2, dash_length=0.12)
        parting_line.set_stroke(opacity=0.6)

        fill = Rectangle(width=0.87, height=0.001, color=METAL_HOT, fill_color=METAL_HOT, fill_opacity=1, stroke_width=0)
        fill.move_to(DOWN * 0.68)

        n1 = numbered_dot(1).move_to(np.array([0, 1.62, 0]))
        n2 = numbered_dot(2).move_to(np.array([0, 0.85, 0]))
        n3 = numbered_dot(3).move_to(np.array([-2.3, 0.9, 0]))
        n4 = numbered_dot(4).move_to(np.array([-2.3, -0.9, 0]))
        n5 = numbered_dot(5).move_to(np.array([0, -0.2, 0]))
        n6 = numbered_dot(6).move_to(np.array([1.65, 0.9, 0]))
        n5.add_updater(lambda m: m)

        legend = Text(
            "1 Pouring Cup   2 Sprue   3 Cope   4 Drag   5 Mould Cavity   6 Riser",
            font_size=16, color=FAINT,
        ).to_edge(DOWN, buff=0.3)

        caption = Text("Pattern & mould preparation", font_size=22, color=WHITE, weight=BOLD)
        caption.next_to(legend, UP, buff=0.25)
        step_label = Text("STEP 1 / 4", font_size=14, color=FAINT, weight=BOLD)
        step_label.next_to(caption, UP, buff=0.12)

        self.play(
            FadeIn(drag), FadeIn(cope_group, shift=UP * 0.3),
            FadeIn(cavity_outline), FadeIn(parting_line),
            FadeIn(legend), FadeIn(caption), FadeIn(step_label),
            FadeIn(n1), FadeIn(n2), FadeIn(n3), FadeIn(n4), FadeIn(n5), FadeIn(n6),
            run_time=0.9,
        )
        self.wait(0.6)

        # Step 2 — pour
        new_caption = Text("Molten metal poured into cavity", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 2 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        self.play(Transform(caption, new_caption), Transform(step_label, new_step), run_time=0.35)

        drop = Circle(radius=0.05, color=METAL_HOT, fill_color=METAL_HOT, fill_opacity=1, stroke_width=0)
        drop.move_to(np.array([0, 1.3, 0]))
        self.play(FadeIn(drop), run_time=0.15)
        self.play(drop.animate.move_to(np.array([0, 0.3, 0])), run_time=0.5, rate_func=rate_functions.ease_in_quad)
        self.remove(drop)

        target_fill = Rectangle(width=0.87, height=0.86, color=METAL_HOT, fill_color=METAL_HOT, fill_opacity=1, stroke_width=0)
        target_fill.move_to(DOWN * 0.23)
        self.play(Transform(fill, target_fill), run_time=1.0, rate_func=rate_functions.ease_out_quad)
        self.wait(0.4)

        # Step 3 — solidify
        new_caption = Text("Solidification & cooling", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 3 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        self.play(
            Transform(caption, new_caption), Transform(step_label, new_step),
            fill.animate.set_color(METAL_COOL),
            run_time=0.9,
        )
        self.wait(0.6)

        # Step 4 — shakeout
        new_caption = Text("Shakeout & fettling", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 4 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        self.play(
            Transform(caption, new_caption), Transform(step_label, new_step),
            cope_group.animate.shift(UP * 1.3),
            VGroup(n1, n2, n6).animate.shift(UP * 1.3),
            FadeOut(cavity_outline),
            FadeOut(parting_line),
            run_time=0.9,
        )
        finished_part = RoundedRectangle(corner_radius=0.04, width=0.87, height=0.86, color=METAL_COOL, fill_color=METAL_COOL, fill_opacity=1, stroke_width=1.5, stroke_color="#c4cad2")
        finished_part.move_to(fill.get_center())
        self.play(Transform(fill, finished_part), run_time=0.4)
        self.wait(1.0)
