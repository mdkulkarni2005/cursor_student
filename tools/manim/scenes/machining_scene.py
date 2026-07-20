from manim import *

config.background_color = "#0c1220"

STEEL = "#7a8590"
DARK_STEEL = "#4a4540"
STOCK = "#5b6b78"
FINISHED = "#b0b6bd"
CHIP = "#ffb347"
ACCENT = "#ff7a45"
FAINT = "#8a94a3"


def numbered_dot(n):
    dot = Circle(radius=0.16, color=WHITE, fill_color="#0c1220", fill_opacity=1, stroke_width=1.5)
    label = Text(str(n), font_size=16, color=WHITE, weight=BOLD)
    label.move_to(dot.get_center())
    return VGroup(dot, label)


class MachiningScene(Scene):
    def construct(self):
        title = Text("Machining — Lathe Turning Operation", font_size=28, color=WHITE, weight=BOLD).to_edge(UP, buff=0.35)
        self.play(FadeIn(title, shift=UP * 0.2), run_time=0.5)

        chuck = RoundedRectangle(corner_radius=0.06, width=1.1, height=1.3, color=DARK_STEEL, fill_color=STEEL, fill_opacity=1, stroke_width=2)
        chuck.move_to(np.array([-3.6, 0, 0]))
        jaws = VGroup(*[
            Rectangle(width=0.22, height=0.22, color=DARK_STEEL, fill_color=DARK_STEEL, fill_opacity=1, stroke_width=0).move_to(np.array([-3.1, y, 0]))
            for y in (-0.35, 0, 0.35)
        ])

        stock_left, stock_right = -3.0, 3.3
        stock = RoundedRectangle(corner_radius=0.05, width=stock_right - stock_left, height=0.85, color=STOCK, fill_opacity=0, stroke_width=1.6, stroke_color=STOCK)
        stock.set_stroke(opacity=0.9)
        stock.move_to(np.array([(stock_left + stock_right) / 2, 0, 0]))

        finished = Rectangle(width=0.001, height=0.55, color=FINISHED, fill_color=FINISHED, fill_opacity=1, stroke_width=0)
        finished.move_to(np.array([stock_left, 0, 0]), aligned_edge=LEFT)

        tailstock = VGroup(
            Polygon([3.3, 0.35, 0], [3.75, 0, 0], [3.3, -0.35, 0], color=STEEL, fill_color=STEEL, fill_opacity=1, stroke_width=1.5),
            Rectangle(width=0.35, height=0.4, color=STEEL, fill_color=STEEL, fill_opacity=1, stroke_width=1.5).move_to(np.array([3.95, 0, 0])),
        )

        spindle_ring = Circle(radius=0.42, color=ACCENT, stroke_width=2).move_to(chuck.get_center())
        spindle_ring.set_stroke(opacity=0.7)
        tick = Line(spindle_ring.get_center(), spindle_ring.get_center() + RIGHT * 0.42, color=ACCENT, stroke_width=2)

        tool_holder = Rectangle(width=0.3, height=0.55, color=DARK_STEEL, fill_color=DARK_STEEL, fill_opacity=1, stroke_width=0)
        tool_bit = Polygon([0, 0, 0], [-0.25, -0.45, 0], [0.22, -0.3, 0], color="#c9c4b8", fill_color="#c9c4b8", fill_opacity=1, stroke_width=0)
        tool = VGroup(tool_holder, tool_bit)

        def place_tool(x, y_touch):
            tool_holder.move_to(np.array([x, y_touch + 0.55, 0]))
            tool_bit.move_to(np.array([x, y_touch + 0.22, 0]))

        retracted_x = 4.6
        place_tool(retracted_x, 0.7)

        feed_arrow = Arrow(np.array([stock_left, -0.85, 0]), np.array([stock_right, -0.85, 0]), color=FAINT, stroke_width=2, buff=0)
        feed_label = Text("Feed Direction", font_size=15, color=FAINT).next_to(feed_arrow, DOWN, buff=0.12)

        n1 = numbered_dot(1).move_to(chuck.get_center() + UP * 0.9)
        n2 = numbered_dot(2).move_to(np.array([0, 0.65, 0]))
        n3 = numbered_dot(3).move_to(np.array([retracted_x, 1.15, 0]))
        n4 = numbered_dot(4).move_to(tailstock.get_center() + UP * 0.55)
        n5 = numbered_dot(5).next_to(feed_label, DOWN, buff=0.15)
        n6 = numbered_dot(6).move_to(np.array([retracted_x - 0.3, 0.85, 0]))

        legend = Text(
            "1 Chuck   2 Workpiece   3 Cutting Tool   4 Tailstock   5 Feed Direction   6 Chip",
            font_size=16, color=FAINT,
        ).to_edge(DOWN, buff=0.3)

        caption = Text("Workpiece setup & clamping", font_size=22, color=WHITE, weight=BOLD)
        caption.next_to(legend, UP, buff=0.25)
        step_label = Text("STEP 1 / 4", font_size=14, color=FAINT, weight=BOLD)
        step_label.next_to(caption, UP, buff=0.12)

        self.play(
            FadeIn(chuck), FadeIn(jaws), Create(stock), FadeIn(tailstock),
            FadeIn(tool), FadeIn(feed_arrow), FadeIn(feed_label),
            FadeIn(legend), FadeIn(caption), FadeIn(step_label),
            FadeIn(n1), FadeIn(n2), FadeIn(n3), FadeIn(n4), FadeIn(n5), FadeIn(n6),
            run_time=0.9,
        )
        self.wait(0.5)

        spindle_ring.add_updater(lambda m, dt: m.rotate(dt * 6))

        def spin_tick(m, dt):
            m.rotate(dt * 6, about_point=spindle_ring.get_center())

        tick.add_updater(spin_tick)

        # Step 2 — roughing cuts
        new_caption = Text("Roughing cuts remove bulk material", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 2 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        self.add(spindle_ring, tick)
        self.play(
            Transform(caption, new_caption), Transform(step_label, new_step),
            FadeOut(n3), FadeOut(n6),
            run_time=0.4,
        )

        rough_x_start, rough_x_end = -2.7, 0.3
        place_tool(rough_x_start, 0.42)
        self.play(FadeOut(VGroup(tool_holder, tool_bit)), run_time=0.01)
        tool2 = VGroup(tool_holder.copy(), tool_bit.copy())
        self.add(tool2)

        target_finished_w = rough_x_end - stock_left
        finished2 = Rectangle(width=target_finished_w, height=0.55, color=FINISHED, fill_color=FINISHED, fill_opacity=1, stroke_width=0)
        finished2.move_to(np.array([stock_left, 0, 0]), aligned_edge=LEFT)
        self.add(finished)

        def move_tool_and_grow(mob, alpha):
            x = interpolate(rough_x_start, rough_x_end, alpha)
            tool2[0].move_to(np.array([x, 0.97, 0]))
            tool2[1].move_to(np.array([x, 0.64, 0]))
            w = max(interpolate(0, target_finished_w, alpha), 0.001)
            new_f = Rectangle(width=w, height=0.55, color=FINISHED, fill_color=FINISHED, fill_opacity=1, stroke_width=0)
            new_f.move_to(np.array([stock_left, 0, 0]), aligned_edge=LEFT)
            finished.become(new_f)

        chip1 = Circle(radius=0.05, color=CHIP, fill_color=CHIP, fill_opacity=1, stroke_width=0).move_to(np.array([rough_x_start, 0.5, 0]))
        chip1.add_updater(lambda m, dt: m.shift(UP * dt * 0.6 + RIGHT * dt * 0.3))
        self.add(chip1)

        self.play(UpdateFromAlphaFunc(tool2, move_tool_and_grow), run_time=1.4, rate_func=linear)
        chip1.clear_updaters()
        self.remove(chip1)
        self.wait(0.3)

        # Step 3 — finishing pass
        new_caption = Text("Finishing pass to tolerance", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 3 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        self.play(Transform(caption, new_caption), Transform(step_label, new_step), run_time=0.35)

        fin_x_start, fin_x_end = rough_x_end, stock_right - 0.3
        chip2 = Circle(radius=0.04, color=CHIP, fill_color=CHIP, fill_opacity=1, stroke_width=0).move_to(np.array([fin_x_start, 0.5, 0]))
        chip2.add_updater(lambda m, dt: m.shift(UP * dt * 0.5 + RIGHT * dt * 0.25))
        self.add(chip2)

        def move_tool_and_grow2(mob, alpha):
            x = interpolate(fin_x_start, fin_x_end, alpha)
            tool2[0].move_to(np.array([x, 0.97, 0]))
            tool2[1].move_to(np.array([x, 0.64, 0]))
            w = max(interpolate(target_finished_w, fin_x_end - stock_left, alpha), 0.001)
            new_f = Rectangle(width=w, height=0.55, color=FINISHED, fill_color=FINISHED, fill_opacity=1, stroke_width=0)
            new_f.move_to(np.array([stock_left, 0, 0]), aligned_edge=LEFT)
            finished.become(new_f)

        self.play(UpdateFromAlphaFunc(tool2, move_tool_and_grow2), run_time=1.4, rate_func=linear)
        chip2.clear_updaters()
        self.remove(chip2)
        self.wait(0.3)

        # Step 4 — deburr & inspect
        new_caption = Text("Deburr & inspect", font_size=22, color=WHITE, weight=BOLD).move_to(caption)
        new_step = Text("STEP 4 / 4", font_size=14, color=FAINT, weight=BOLD).move_to(step_label)
        spindle_ring.clear_updaters()
        tick.clear_updaters()
        self.play(
            Transform(caption, new_caption), Transform(step_label, new_step),
            tool2.animate.move_to(np.array([retracted_x, 0.7, 0])).shift(RIGHT * 0),
            FadeOut(spindle_ring), FadeOut(tick),
            run_time=0.6,
        )
        check = VGroup(
            Circle(radius=0.28, color="#059669", stroke_width=2.5),
            VMobject(stroke_color="#059669", stroke_width=2.5).set_points_as_corners(
                [np.array([-0.1, 0, 0]), np.array([-0.02, -0.1, 0]), np.array([0.15, 0.12, 0])]
            ),
        ).move_to(np.array([0, 1.3, 0]))
        self.play(FadeIn(check, scale=0.7), run_time=0.5)
        self.wait(1.0)
